"use client";

import * as mockApi from "@/lib/mock-api";

type SortMode = "confidence" | "latest" | "oldest";

type Props = {
  result: mockApi.LeakageCandidateSearchResult;
  sortedCandidates: mockApi.LeakageCandidate[];
  sortMode: SortMode;
  onSortModeChange: (mode: SortMode) => void;
  selectedDeviceLabel: string;
  onBlockUser: (candidate: mockApi.LeakageCandidate) => void;
  onBlockDevice: (candidate: mockApi.LeakageCandidate) => void;
  busyKey: string;
};

export function LeakageCandidateResults({
  result,
  sortedCandidates,
  sortMode,
  onSortModeChange,
  selectedDeviceLabel,
  onBlockUser,
  onBlockDevice,
  busyKey
}: Props) {
  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">찾은 후보</div>
          <div className="stat-value">{result.summary.totalCandidates}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">검색 조건</div>
          <div className="muted">
            세션: {result.summary.searchedBy.sessionCodeFragment ?? "-"}
            <br />
            지사: {result.summary.searchedBy.branchCode ?? "-"}
            <br />
            기기: {selectedDeviceLabel || result.summary.searchedBy.deviceId || "-"}
            <br />
            사용자: {result.summary.searchedBy.username ?? "-"}
            <br />
            행동: {result.summary.searchedBy.auditActionType ?? "-"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">정렬 기준</div>
          <select className="input" value={sortMode} onChange={(event) => onSortModeChange(event.target.value as SortMode)}>
            <option value="confidence">일치 가능성 높은 순</option>
            <option value="latest">최근 접속 순</option>
            <option value="oldest">오래된 접속 순</option>
          </select>
        </div>
      </div>

      {sortedCandidates.length === 0 ? (
        <div className="panel">
          <div className="muted">입력한 조건과 일치하는 세션 후보가 없습니다.</div>
        </div>
      ) : (
        <div className="stack">
          {sortedCandidates.map((candidate) => (
            <div key={candidate.id} className="panel stack">
              <div className="panel-header-inline">
                <div>
                  <strong>{candidate.branchName}</strong> / {candidate.username}
                  <div className="muted">
                    세션 코드 끝자리: {candidate.sessionCodeTail} / 상태: {candidate.statusLabel} / 접속 IP: {candidate.ipAddress}
                  </div>
                </div>
                <span className="badge">일치 단서 {candidate.confidenceScore}개</span>
              </div>

              <div className="page-actions">
                <button
                  className="button secondary"
                  disabled={busyKey === `user-${candidate.userId}` || !candidate.userId}
                  onClick={() => onBlockUser(candidate)}
                  type="button"
                >
                  {busyKey === `user-${candidate.userId}` ? "계정 차단 중..." : "이 계정 차단"}
                </button>
                <button
                  className="button secondary"
                  disabled={busyKey === `device-${candidate.deviceId}` || !candidate.deviceId}
                  onClick={() => onBlockDevice(candidate)}
                  type="button"
                >
                  {busyKey === `device-${candidate.deviceId}` ? "기기 차단 중..." : "이 기기 차단"}
                </button>
              </div>

              <div className="grid two">
                <div className="metric-card stack">
                  <div className="stat-label">워터마크 단서</div>
                  <div className="content-break">{candidate.watermarkSummary}</div>
                  <div className="muted">일치한 기준: {candidate.matchedBy.length > 0 ? candidate.matchedBy.join(", ") : "없음"}</div>
                  <div className="muted">접속 시각: {candidate.startedAt}</div>
                  <div className="muted">연결된 기기: {candidate.deviceLabel ?? "확인 필요"}</div>
                </div>

                <div className="metric-card stack">
                  <div className="stat-label">최근 감사 로그</div>
                  {candidate.recentAuditLogs.length === 0 ? (
                    <div className="muted">관련 감사 로그가 없습니다.</div>
                  ) : (
                    <div className="stack" style={{ gap: 10 }}>
                      {candidate.recentAuditLogs.map((log, index) => (
                        <div key={`${candidate.id}-audit-${index}`}>
                          <strong>{log.actionLabel}</strong>
                          <div className="muted">{log.createdAt}</div>
                          <div className="content-break">{log.summary}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="metric-card stack">
                <div className="stat-label">최근 보안 이벤트</div>
                {candidate.recentSecurityEvents.length === 0 ? (
                  <div className="muted">관련 보안 이벤트가 없습니다.</div>
                ) : (
                  <div className="stack" style={{ gap: 10 }}>
                    {candidate.recentSecurityEvents.map((securityEvent, index) => (
                      <div key={`${candidate.id}-event-${index}`}>
                        <strong>
                          {securityEvent.typeLabel} / {securityEvent.severity}
                        </strong>
                        <div className="muted">{securityEvent.createdAt}</div>
                        <div className="content-break">{securityEvent.detail}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
