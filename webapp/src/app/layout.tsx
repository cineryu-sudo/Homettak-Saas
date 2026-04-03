import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "홈서비스 자동화 SaaS",
  description: "한국 홈서비스 운영 대시보드 — 주문, 일정, 기사 관리 자동화",
};

/**
 * 루트 레이아웃.
 *
 * Sidebar + main 영역으로 구성됩니다.
 * - 데스크탑: 좌측 사이드바(w-64) + 우측 콘텐츠(ml-64)
 * - 모바일: 사이드바 숨김 + 전체 폭 콘텐츠(ml-0, pt-16으로 햄버거 버튼 공간 확보)
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <Sidebar />
        {/* md 이상: ml-64로 사이드바 공간 확보
            md 미만: ml-0, pt-16으로 햄버거 버튼 공간만 확보 */}
        <main className="min-h-screen p-6 pt-16 md:ml-64 md:p-8 md:pt-8">
          {children}
        </main>
      </body>
    </html>
  );
}
