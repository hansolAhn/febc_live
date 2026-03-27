"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useAuth } from "./providers/AuthProvider";

const basicLinks = [
  { href: "/", label: "사용자 메인" },
  { href: "/live", label: "라이브 시청" }
];

const adminLinks = [
  { href: "/dashboard", label: "관리자 대시보드" },
  { href: "/security-events", label: "보안 이벤트" },
  { href: "/policies", label: "정책 관리" }
];

const adminOnlyPaths = new Set(["/dashboard", "/security-events", "/audit-logs", "/tracking", "/policies", "/leakage-analysis"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();

  const isMasterAdmin = user?.roleCode === "SUPER_ADMIN";
  const links = useMemo(() => (isMasterAdmin ? adminLinks : basicLinks), [isMasterAdmin]);

  useEffect(() => {
    if (isLoading) return;

    if (!user && pathname !== "/login") {
      router.replace("/login");
      return;
    }

    if (user && !isMasterAdmin && adminOnlyPaths.has(pathname)) {
      router.replace("/live");
    }
  }, [isLoading, isMasterAdmin, pathname, router, user]);

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <span className="badge">FEBC Live</span>
          <h1 className="brand-title">Internal Streaming Console</h1>
          <div className="brand-copy">내부 라이브 시청, 운영 관리, 유출 추적을 위한 FEBC 보안 스트리밍 콘솔입니다.</div>
        </div>

        <nav className="nav-list">
          {links.map((link) => (
            <Link key={link.href} className={`nav-link ${pathname === link.href ? "active" : ""}`} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-meta">
          로그인 계정: {user.username}
          <br />
          지사: {user.branchName}
          <br />
          권한: {isMasterAdmin ? "최고 관리자" : "지사 사용자"}
        </div>

        <button
          className="button ghost"
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
          type="button"
        >
          로그아웃
        </button>
      </aside>

      <main className="content-area">{children}</main>
    </div>
  );
}

