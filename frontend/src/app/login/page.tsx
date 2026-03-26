"use client";

import { LoginForm } from "@/components/LoginForm";
import { useAuth } from "@/components/providers/AuthProvider";

export default function LoginPage() {
  const { user } = useAuth();

  return (
    <div className="login-shell">
      <div className="login-card">
        <section className="login-hero">
          <div>
            <span className="badge">FEBC Secure Streaming</span>
            <h1 className="page-title" style={{ color: "white", marginTop: 16 }}>내부 라이브 접근 제어</h1>
            <p className="page-subtitle" style={{ color: "rgba(255,255,255,.78)" }}>
              지사 계정, 허용 IP, OTP, 등록 기기 정책을 적용하는 관리자형 로그인 화면 골격입니다.
            </p>
          </div>
          <div className="sidebar-meta">
            테스트 계정: `seoul-hq / branch_admin / pass1234 / 123456`
            <br />
            {user ? `현재 로그인: ${user.username}` : "현재 로그인 없음"}
          </div>
        </section>
        <section className="login-form-pane">
          <div>
            <div className="panel-title">로그인</div>
            <div className="muted">현재는 mock API 기준으로 화면과 상태 흐름을 먼저 검증합니다.</div>
          </div>
          <LoginForm />
        </section>
      </div>
    </div>
  );
}
