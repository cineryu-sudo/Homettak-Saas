"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/**
 * 사이드바 메뉴 항목 정의.
 */
const 메뉴 = [
  { href: "/", label: "대시보드", icon: "📊" },
  { href: "/orders", label: "주문 관리", icon: "📋" },
  { href: "/schedule", label: "일정 관리", icon: "📅" },
  { href: "/technicians", label: "기사 관리", icon: "🔧" },
];

/**
 * 프리미엄 다크 네이비 사이드바.
 */
export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* ── 모바일 햄버거 버튼 ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--sidebar-bg)] text-white shadow-lg md:hidden"
        aria-label="메뉴 열기"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* ── 모바일 오버레이 ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── 사이드바 본체 ── */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-64 flex-col transition-transform duration-300 md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "var(--sidebar-bg)" }}
      >
        {/* 로고 */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              홈앤뚝딱
            </h1>
            <p className="mt-0.5 text-[11px]" style={{ color: "var(--sidebar-text)" }}>
              홈서비스 운영 자동화
            </p>
          </div>
          {/* 모바일 닫기 */}
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 md:hidden"
            aria-label="메뉴 닫기"
          >
            ✕
          </button>
        </div>

        {/* 메뉴 */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {메뉴.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-all duration-200 ${
                  active
                    ? "bg-[var(--sidebar-accent)] text-white font-medium shadow-lg shadow-blue-500/20"
                    : "text-[var(--sidebar-text)] hover:bg-[var(--sidebar-bg-hover)] hover:text-white"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 하단 */}
        <div className="px-4 py-4" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 text-sm font-bold text-white">
              H
            </div>
            <div>
              <p className="text-xs font-medium text-white">HomeTTak</p>
              <p className="text-[10px] text-[var(--sidebar-text)]">v0.3.0-kor</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
