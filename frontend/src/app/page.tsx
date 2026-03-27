"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { useAuth } from "@/components/providers/AuthProvider";

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
      return;
    }

    if (!isLoading && user?.roleCode === "SUPER_ADMIN") {
      router.replace("/dashboard");
    }
  }, [isLoading, router, user]);

  if (isLoading) {
    return (
      <div className="login-shell">
        <div className="panel">로그인 상태를 확인하는 중입니다...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="login-shell">
        <div className="panel">로그인 화면으로 이동하는 중입니다...</div>
      </div>
    );
  }

  if (user.roleCode === "SUPER_ADMIN") {
    return (
      <div className="login-shell">
        <div className="panel">관리자 대시보드로 이동하는 중입니다...</div>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <PageHeader
        title="사용자 메인"
        subtitle={`${user.branchName} 계정으로 내부 방송 시청 준비가 완료되었습니다.`}
      />

      <div className="metrics">
        <StatCard label="현재 지사" value={user.branchName} detail={user.branchCode} />
        <StatCard label="권한" value="지사 사용자" detail="라이브 시청 권한 사용 가능" />
        <StatCard label="현재 기기" value={user.deviceLabel} detail="지금 로그인에 사용 중인 기기입니다." />
      </div>

      <div className="panel">
        <div className="panel-title">시청 안내</div>
        <div className="stack muted">
          <div>왼쪽의 라이브 시청 메뉴에서 내부 방송을 바로 볼 수 있습니다.</div>
        </div>
      </div>
    </div>
  );
}
