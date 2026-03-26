import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";
import { AuditActionType, SecurityEventType, SessionStatus } from "../common/enums";
import { InMemoryDataService } from "../database/in-memory-data.service";
import { RedisService } from "../redis/redis.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { SecurityEventsService } from "../security-events/security-events.service";

type StoredSession = {
  id: string;
  userId: string;
  branchId: string;
  deviceId?: string;
  deviceLabel?: string;
  sessionKey: string;
  accessToken: string;
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
  status: SessionStatus;
  createdAt: string;
  lastSeenAt: string;
};

@Injectable()
export class SessionsService {
  private readonly sessionTtlSeconds: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataService: InMemoryDataService,
    private readonly redisService: RedisService,
    private readonly auditLogsService: AuditLogsService,
    private readonly securityEventsService: SecurityEventsService
  ) {
    this.sessionTtlSeconds = Number(this.configService.get<string>("SESSION_TTL_SECONDS") ?? "43200");
  }

  async findAll() {
    const client = this.redisService.getClient();
    const tokens = await client.sMembers(this.allSessionsKey());

    const sessions = (
      await Promise.all(
        tokens.map(async (token) => {
          const session = await this.readSession(token);
          if (!session) {
            await client.sRem(this.allSessionsKey(), token);
            return null;
          }
          return session;
        })
      )
    ).filter((session): session is StoredSession => Boolean(session));

    return sessions.map((session) => {
      const user = this.dataService.findUserById(session.userId);
      const branch = this.dataService.getBranches().find((item) => item.id === session.branchId);

      return {
        id: session.id,
        userId: session.userId,
        branchId: session.branchId,
        deviceId: session.deviceId ?? null,
        deviceLabel: session.deviceLabel ?? null,
        branchCode: branch?.code ?? "unknown",
        branchName: branch?.name ?? "Unknown Branch",
        username: user?.username ?? "unknown",
        sessionKey: session.sessionKey,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        startedAt: session.createdAt,
        lastSeenAt: session.lastSeenAt,
        status: session.status
      };
    });
  }

  async findActiveSessionsByUser(userId: string) {
    const client = this.redisService.getClient();
    const userTokens = await client.sMembers(this.userSessionsKey(userId));
    const sessions = (
      await Promise.all(userTokens.map((token) => this.readSession(token)))
    ).filter((session): session is StoredSession => Boolean(session && session.status === SessionStatus.ACTIVE));

    return sessions;
  }

  async findByAccessToken(accessToken: string) {
    const session = await this.readSession(accessToken);
    if (!session || session.status !== SessionStatus.ACTIVE) {
      return null;
    }

    const updatedSession = {
      ...session,
      lastSeenAt: new Date().toISOString()
    };
    await this.writeSession(updatedSession);
    return updatedSession;
  }

  async findActiveSessionByBranchAndSessionKey(branchId: string, sessionKey: string) {
    const client = this.redisService.getClient();
    const branchTokens = await client.sMembers(this.branchSessionsKey(branchId));
    const activeSessions = (
      await Promise.all(branchTokens.map((token) => this.readSession(token)))
    ).filter((session): session is StoredSession => Boolean(session && session.status === SessionStatus.ACTIVE));
    return activeSessions.find((session) => session.sessionKey === sessionKey) ?? null;
  }

  async findActiveSessionBySessionKey(sessionKey: string) {
    const client = this.redisService.getClient();
    const tokens = await client.sMembers(this.allSessionsKey());
    const activeSessions = (
      await Promise.all(tokens.map((token) => this.readSession(token)))
    ).filter((session): session is StoredSession => Boolean(session && session.status === SessionStatus.ACTIVE));

    return activeSessions.find((session) => session.sessionKey === sessionKey) ?? null;
  }

  async terminateByAccessToken(accessToken: string) {
    const session = await this.readSession(accessToken);
    if (!session) {
      return null;
    }

    const terminatedSession = {
      ...session,
      status: SessionStatus.TERMINATED,
      lastSeenAt: new Date().toISOString()
    };

    await this.writeSession(terminatedSession);

    const client = this.redisService.getClient();
    await client.sRem(this.branchSessionsKey(session.branchId), session.accessToken);
    await client.sRem(this.allSessionsKey(), session.accessToken);

    return terminatedSession;
  }

  async enforceSingleSession(branchId: string, userId: string) {
    const client = this.redisService.getClient();
    const userTokens = await client.sMembers(this.userSessionsKey(userId));
    const activeSessions = (
      await Promise.all(userTokens.map((token) => this.readSession(token)))
    ).filter((session): session is StoredSession => Boolean(session && session.status === SessionStatus.ACTIVE));

    if (activeSessions.length === 0) {
      return;
    }

    await Promise.all(
      activeSessions.map(async (session) => {
        await this.writeSession({ ...session, status: SessionStatus.TERMINATED });
        await client.sRem(this.branchSessionsKey(branchId), session.accessToken);
        await client.sRem(this.userSessionsKey(userId), session.accessToken);
      })
    );

    this.securityEventsService.create({
      branchId,
      userId,
      eventType: SecurityEventType.SESSION_TAKEOVER,
      severity: "medium",
      detail: {
        terminatedSessionCount: activeSessions.length,
        terminatedSessionKeys: activeSessions.map((session) => session.sessionKey)
      }
    });
  }

  async create(input: {
    userId: string;
    branchId: string;
    deviceId?: string;
    deviceLabel?: string;
    accessToken: string;
    refreshToken: string;
    ipAddress: string;
    userAgent: string;
  }) {
    const now = new Date().toISOString();
    const session: StoredSession = {
      id: randomUUID(),
      userId: input.userId,
      branchId: input.branchId,
      deviceId: input.deviceId,
      deviceLabel: input.deviceLabel,
      sessionKey: randomUUID(),
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      status: SessionStatus.ACTIVE,
      createdAt: now,
      lastSeenAt: now
    };

    await this.writeSession(session);

    const client = this.redisService.getClient();
    await client.sAdd(this.allSessionsKey(), session.accessToken);
    await client.sAdd(this.branchSessionsKey(session.branchId), session.accessToken);
    await client.sAdd(this.userSessionsKey(session.userId), session.accessToken);

    this.auditLogsService.create({
      branchId: input.branchId,
      userId: input.userId,
      actorIp: input.ipAddress,
      actionType: AuditActionType.LOGIN_ATTEMPT,
      payload: { sessionKey: session.sessionKey, userAgent: input.userAgent, storage: "redis" }
    });

    return session;
  }

  private async readSession(accessToken: string) {
    const client = this.redisService.getClient();
    const raw = await client.get(this.sessionKey(accessToken));
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as StoredSession;
  }

  private async writeSession(session: StoredSession) {
    const client = this.redisService.getClient();
    await client.set(this.sessionKey(session.accessToken), JSON.stringify(session), {
      EX: this.sessionTtlSeconds
    });
  }

  private sessionKey(accessToken: string) {
    return `febc:session:access:${accessToken}`;
  }

  private allSessionsKey() {
    return "febc:sessions:all";
  }

  private branchSessionsKey(branchId: string) {
    return `febc:sessions:branch:${branchId}`;
  }

  private userSessionsKey(userId: string) {
    return `febc:sessions:user:${userId}`;
  }
}
