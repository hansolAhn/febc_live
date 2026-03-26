import { Injectable } from "@nestjs/common";
@Injectable()
export class AppService {
  getHealth() { return { status: "ok", service: "febc-live-backend", timestamp: new Date().toISOString() }; }
}
