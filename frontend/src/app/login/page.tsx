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
            <h1 className="page-title" style={{ color: "white", marginTop: 16 }}>극동방송 라이브</h1>
          </div>
          <div className="sidebar-meta">
            테스트 계정: `branch_admin / pass1234 / 123456`
            <br />
            {user ? `현재 로그인: ${user.username}` : "현재 로그인 없음"}
          </div>
        </section>
        <section className="login-form-pane">
          <div>
            <div className="panel-title">로그인</div>
          </div>
          <LoginForm />
        </section>
      </div>
    </div>
  );
}
