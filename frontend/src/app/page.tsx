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

  const isSuperAdmin = user.roleCode === "SUPER_ADMIN";

  return (
    <div className="page-wrap">
      <PageHeader
        title="사용자 메인"
        subtitle={
          isSuperAdmin
            ? `${user.branchName} 관리자 계정의 현재 접속 상태와 운영 바로가기를 확인합니다.`
            : `${user.branchName} 계정으로 내부 방송 시청 준비가 완료되었습니다.`
        }
      />

      <div className="metrics">
        <StatCard label="현재 지사" value={user.branchName} detail={isSuperAdmin ? user.branchCode : ""} />
        <StatCard label="권한" value={isSuperAdmin ? "최고 관리자" : "지사 사용자"} detail={isSuperAdmin ? "운영 메뉴 전체 접근 가능" : ""} />
        <StatCard label="현재 기기" value={user.deviceLabel} detail={isSuperAdmin ? "지금 로그인에 사용 중인 기기입니다." : ""} />
      </div>

      {isSuperAdmin ? (
        <div className="grid two">
          <div className="panel">
            <div className="panel-title">운영 안내</div>
            <div className="stack muted">
              <div>관리자 대시보드에서 보안 이벤트, 감사 로그, 기기 상태를 함께 확인할 수 있습니다.</div>
              <div>라이브 시청 화면과 대시보드 미리보기에서 현재 방송 상태를 바로 모니터링할 수 있습니다.</div>
            </div>
          </div>
          <div className="panel">
            <div className="panel-title">현재 상태</div>
            <div className="stack muted">
              <div>로그인, 세션 유지, OTP, 기기 승인과 차단 흐름이 정상 동작 중입니다.</div>
              <div>보호된 재생 주소와 워터마크 구조를 통해 내부 방송 시청과 추적 기능이 함께 동작합니다.</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="panel">
          <div className="panel-title">시청 안내</div>
          <div className="stack muted">
            <div>왼쪽의 라이브 시청 메뉴에서 내부 방송을 바로 볼 수 있습니다.</div>
          </div>
        </div>
      )}
    </div>
  );
}
