"use client";

import { FormEvent, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import * as mockApi from "@/lib/mock-api";

type SearchFormState = {
  sessionCodeFragment: string;
  branchCode: string;
  username: string;
  observedAt: string;
};

type SortMode = "confidence" | "latest" | "oldest";

const initialFormState: SearchFormState = {
  sessionCodeFragment: "",
  branchCode: "",
  username: "",
  observedAt: ""
};

export default function LeakageAnalysisPage() {
  const [form, setForm] = useState<SearchFormState>(initialFormState);
  const [sortMode, setSortMode] = useState<SortMode>("confidence");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<mockApi.LeakageCandidateSearchResult | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [busyKey, setBusyKey] = useState("");

  const hasQuery = useMemo(() => Object.values(form).some((value) => value.trim().length > 0), [form]);

  const sortedCandidates = useMemo(() => {
    if (!result) {
      return [];
    }

    const nextCandidates = [...result.candidates];
    nextCandidates.sort((left, right) => {
      if (sortMode === "latest") {
        return right.startedAt.localeCompare(left.startedAt);
      }

      if (sortMode === "oldest") {
        return left.startedAt.localeCompare(right.startedAt);
      }

      return right.confidenceScore - left.confidenceScore || right.startedAt.localeCompare(left.startedAt);
    });

    return nextCandidates;
  }, [result, sortMode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setActionMessage("");

    try {
      const nextResult = await mockApi.fetchLeakageCandidates({
        sessionCodeFragment: form.sessionCodeFragment.trim() || undefined,
        branchCode: form.branchCode.trim() || undefined,
        username: form.username.trim() || undefined,
        observedAt: form.observedAt || undefined
      });
      setResult(nextResult);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "유출 후보 분석을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setForm(initialFormState);
    setResult(null);
    setError("");
    setActionMessage("");
    setSelectedFileName("");
  }

  async function handleBlockUser(candidate: mockApi.LeakageCandidate) {
    setBusyKey(`user-${candidate.userId}`);
    setActionMessage("");

    try {
      await mockApi.blockUser(candidate.userId);
      setActionMessage(`${candidate.username} 계정을 차단했습니다.`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "계정 차단에 실패했습니다.");
    } finally {
      setBusyKey("");
    }
  }

  async function handleBlockDevice(candidate: mockApi.LeakageCandidate) {
    if (!candidate.deviceId) {
      setError("이 세션과 연결된 기기 정보를 찾지 못했습니다.");
      return;
    }

    setBusyKey(`device-${candidate.deviceId}`);
    setActionMessage("");

    try {
      await mockApi.blockDevice(candidate.deviceId);
      setActionMessage(`${candidate.deviceLabel ?? "해당 기기"}를 차단했습니다.`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "기기 차단에 실패했습니다.");
    } finally {
      setBusyKey("");
    }
  }

  return (
    <div className="page-wrap">
      <PageHeader
        title="유출 분석"
        subtitle="유출 화면에서 확인한 단서를 넣으면 관련 세션 후보를 좁혀보고, 바로 계정 또는 기기를 차단할 수 있습니다."
      />

      <form className="panel stack" onSubmit={handleSubmit}>
        <div className="grid two">
          <div>
            <label className="label" htmlFor="session-code-fragment">
              세션 코드 조각
            </label>
            <input
              id="session-code-fragment"
              className="input"
              placeholder="예: b016f 또는 끝 6~8자리"
              value={form.sessionCodeFragment}
              onChange={(event) => setForm((current) => ({ ...current, sessionCodeFragment: event.target.value }))}
            />
          </div>

          <div>
            <label className="label" htmlFor="branch-code">
              지사 코드
            </label>
            <input
              id="branch-code"
              className="input"
              placeholder="예: seoul-hq"
              value={form.branchCode}
              onChange={(event) => setForm((current) => ({ ...current, branchCode: event.target.value }))}
            />
          </div>

          <div>
            <label className="label" htmlFor="username">
              사용자명
            </label>
            <input
              id="username"
              className="input"
              placeholder="예: branch_admin"
              value={form.username}
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
            />
          </div>

          <div>
            <label className="label" htmlFor="observed-at">
              예상 유출 시각
            </label>
            <input
              id="observed-at"
              className="input"
              type="datetime-local"
              value={form.observedAt}
              onChange={(event) => setForm((current) => ({ ...current, observedAt: event.target.value }))}
            />
            <div className="muted" style={{ marginTop: 8 }}>
              입력한 시각 기준으로 앞뒤 10분 범위 안의 세션 후보를 찾습니다.
            </div>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="capture-file">
            유출 캡처 파일
          </label>
          <label className="file-upload-box" htmlFor="capture-file">
            <span className="file-upload-button">파일 선택</span>
            <span className={`file-upload-name ${selectedFileName ? "has-file" : ""}`}>
              {selectedFileName || "선택된 파일 없음"}
            </span>
          </label>
          <input
            id="capture-file"
            className="file-upload-input"
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setSelectedFileName(file?.name ?? "");
            }}
          />
          <div className="muted" style={{ marginTop: 8 }}>
            {selectedFileName
              ? `선택한 파일: ${selectedFileName} / 현재는 업로드 저장 없이 운영자가 참고용으로만 사용합니다.`
              : "현재는 이미지 자동 분석 전 단계라 파일명 확인용 자리만 먼저 반영했습니다."}
          </div>
        </div>

        <div className="page-actions">
          <button className="button primary" disabled={isLoading || !hasQuery} type="submit">
            {isLoading ? "후보 분석 중..." : "후보 찾기"}
          </button>
          <button className="button secondary" disabled={isLoading} onClick={resetForm} type="button">
            입력 초기화
          </button>
        </div>

        {error ? (
          <div className="muted" style={{ color: "var(--danger)" }}>
            {error}
          </div>
        ) : null}
        {actionMessage ? (
          <div className="muted" style={{ color: "var(--success)" }}>
            {actionMessage}
          </div>
        ) : null}
      </form>

      {result ? (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">찾은 후보</div>
              <div className="stat-value">{result.summary.totalCandidates}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">검색 조건</div>
              <div className="muted">
                세션 코드: {result.summary.searchedBy.sessionCodeFragment ?? "-"}
                <br />
                지사: {result.summary.searchedBy.branchCode ?? "-"}
                <br />
                사용자: {result.summary.searchedBy.username ?? "-"}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">정렬 기준</div>
              <select className="input" value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
                <option value="confidence">일치 가능성 높은 순</option>
                <option value="latest">최근 접속 순</option>
                <option value="oldest">오래된 접속 순</option>
              </select>
            </div>
          </div>

          {sortedCandidates.length === 0 ? (
            <div className="panel">
              <div className="muted">입력한 조건과 일치하는 세션 후보가 없습니다. 세션 코드 조각이나 예상 유출 시각을 조금 넓혀서 다시 확인해보세요.</div>
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
                      onClick={() => void handleBlockUser(candidate)}
                      type="button"
                    >
                      {busyKey === `user-${candidate.userId}` ? "계정 차단 중..." : "이 계정 차단"}
                    </button>
                    <button
                      className="button secondary"
                      disabled={busyKey === `device-${candidate.deviceId}` || !candidate.deviceId}
                      onClick={() => void handleBlockDevice(candidate)}
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
      ) : null}
    </div>
  );
}
