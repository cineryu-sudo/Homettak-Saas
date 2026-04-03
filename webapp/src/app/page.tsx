"use client";

import { useMemo, useState } from "react";

type 대시보드탭 = "ops" | "schedule" | "profit";
type 주문상태 =
  | "접수"
  | "상담중"
  | "예약확정"
  | "발주완료"
  | "시공완료"
  | "정산완료";
type 정렬키 = "순수익" | "마진율" | "주문수" | "매출";

interface 주문레코드 {
  id: string;
  고객명: string;
  채널: "네이버" | "전화" | "카드" | "기타";
  제품: string;
  추가작업: string | null;
  상태: 주문상태;
  기사: string;
  접수일시: string;
  시공일시: string;
  발주기한: string;
  매출: number;
  원가: number;
  페이백: number;
  할인: number;
  채널수수료율: number;
  예약금확인: boolean;
  잔금확인: boolean;
  리마인드발송: boolean;
}

interface 알림카드 {
  id: "저마진" | "미입금" | "발주지연" | "리마인드미발송";
  제목: string;
  심각도: "높음" | "중간";
  건수: number;
  주문id목록: string[];
  액션라벨: string;
}

interface 일정이슈 {
  id: string;
  제목: string;
  심각도: "높음" | "중간";
  설명: string;
  주문id목록: string[];
  액션라벨: string;
  액션타입: "확인" | "재발송";
}

interface 제품지표 {
  제품: string;
  주문수: number;
  추가작업수: number;
  매출: number;
  순수익: number;
  마진율: number;
}

const KRW = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

const 상태순서: 주문상태[] = [
  "접수",
  "상담중",
  "예약확정",
  "발주완료",
  "시공완료",
  "정산완료",
];

const 탭목록: { key: 대시보드탭; 라벨: string; 설명: string }[] = [
  {
    key: "ops",
    라벨: "P0 운영 종합",
    설명: "오늘 우선 처리, 단계 전환, 긴급 알림",
  },
  {
    key: "schedule",
    라벨: "P1 일정 리스크",
    설명: "중복 배정, 리마인드 실패, 당일 조치",
  },
  {
    key: "profit",
    라벨: "P2 제품 수익성",
    설명: "제품별 마진, 추가작업 부착률, 집중 관리",
  },
];

function 시각(dayOffset: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function 날짜키(iso: string): string {
  return iso.slice(0, 10);
}

function 월키(iso: string): string {
  return iso.slice(0, 7);
}

function 퍼센트(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

function 상태인덱스(상태: 주문상태): number {
  return 상태순서.indexOf(상태);
}

function 채널수수료(주문: 주문레코드): number {
  return 주문.매출 * 주문.채널수수료율;
}

function 순수익(주문: 주문레코드): number {
  const 제품마진 = 주문.매출 - 주문.원가;
  return 제품마진 + 주문.페이백 - 주문.할인 - 채널수수료(주문);
}

function 마진율(주문: 주문레코드): number {
  return 주문.매출 === 0 ? 0 : 순수익(주문) / 주문.매출;
}

const 초기주문: 주문레코드[] = [
  {
    id: "HD-260309-001",
    고객명: "김민수",
    채널: "네이버",
    제품: "아티잔 858",
    추가작업: "모서리 따내기",
    상태: "예약확정",
    기사: "이인복",
    접수일시: 시각(0, 9, 5),
    시공일시: 시각(1, 10, 0),
    발주기한: 시각(-1, 9, 0),
    매출: 520000,
    원가: 450000,
    페이백: 15000,
    할인: 30000,
    채널수수료율: 0.055,
    예약금확인: false,
    잔금확인: false,
    리마인드발송: false,
  },
  {
    id: "HD-260309-002",
    고객명: "박하나",
    채널: "전화",
    제품: "네오 싱크 740",
    추가작업: null,
    상태: "예약확정",
    기사: "이인복",
    접수일시: 시각(-1, 14, 10),
    시공일시: 시각(1, 10, 0),
    발주기한: 시각(0, 10, 0),
    매출: 410000,
    원가: 280000,
    페이백: 20000,
    할인: 0,
    채널수수료율: 0,
    예약금확인: true,
    잔금확인: false,
    리마인드발송: true,
  },
  {
    id: "HD-260309-003",
    고객명: "최민지",
    채널: "카드",
    제품: "아티잔 858",
    추가작업: "배수구 업그레이드",
    상태: "발주완료",
    기사: "강태규",
    접수일시: 시각(-2, 10, 30),
    시공일시: 시각(2, 14, 0),
    발주기한: 시각(0, 11, 0),
    매출: 630000,
    원가: 380000,
    페이백: 25000,
    할인: 10000,
    채널수수료율: 0.033,
    예약금확인: true,
    잔금확인: false,
    리마인드발송: true,
  },
  {
    id: "HD-260309-004",
    고객명: "이도윤",
    채널: "네이버",
    제품: "클래식 볼 620",
    추가작업: null,
    상태: "시공완료",
    기사: "윤소정",
    접수일시: 시각(-3, 13, 20),
    시공일시: 시각(0, 11, 0),
    발주기한: 시각(-2, 9, 0),
    매출: 360000,
    원가: 250000,
    페이백: 12000,
    할인: 10000,
    채널수수료율: 0.055,
    예약금확인: true,
    잔금확인: true,
    리마인드발송: true,
  },
  {
    id: "HD-260309-005",
    고객명: "남은진",
    채널: "전화",
    제품: "네오 싱크 740",
    추가작업: "호스 키트",
    상태: "정산완료",
    기사: "박건우",
    접수일시: 시각(-7, 9, 10),
    시공일시: 시각(-1, 9, 0),
    발주기한: 시각(-4, 9, 0),
    매출: 540000,
    원가: 340000,
    페이백: 28000,
    할인: 15000,
    채널수수료율: 0,
    예약금확인: true,
    잔금확인: true,
    리마인드발송: true,
  },
  {
    id: "HD-260309-006",
    고객명: "한지수",
    채널: "기타",
    제품: "클래식 볼 620",
    추가작업: null,
    상태: "상담중",
    기사: "미배정",
    접수일시: 시각(0, 12, 15),
    시공일시: 시각(3, 11, 0),
    발주기한: 시각(1, 10, 0),
    매출: 330000,
    원가: 240000,
    페이백: 10000,
    할인: 0,
    채널수수료율: 0.01,
    예약금확인: false,
    잔금확인: false,
    리마인드발송: false,
  },
  {
    id: "HD-260309-007",
    고객명: "서지훈",
    채널: "네이버",
    제품: "아티잔 858",
    추가작업: "모서리 따내기",
    상태: "접수",
    기사: "미배정",
    접수일시: 시각(0, 16, 40),
    시공일시: 시각(4, 10, 0),
    발주기한: 시각(2, 9, 0),
    매출: 590000,
    원가: 410000,
    페이백: 18000,
    할인: 0,
    채널수수료율: 0.055,
    예약금확인: false,
    잔금확인: false,
    리마인드발송: false,
  },
  {
    id: "HD-260309-008",
    고객명: "정아라",
    채널: "카드",
    제품: "프라임 싱크 900",
    추가작업: "정수 필터",
    상태: "예약확정",
    기사: "박건우",
    접수일시: 시각(-1, 11, 15),
    시공일시: 시각(1, 13, 30),
    발주기한: 시각(-2, 10, 0),
    매출: 680000,
    원가: 470000,
    페이백: 32000,
    할인: 20000,
    채널수수료율: 0.033,
    예약금확인: true,
    잔금확인: false,
    리마인드발송: false,
  },
  {
    id: "HD-260309-009",
    고객명: "문혜리",
    채널: "전화",
    제품: "프라임 싱크 900",
    추가작업: null,
    상태: "시공완료",
    기사: "강태규",
    접수일시: 시각(-4, 10, 5),
    시공일시: 시각(0, 15, 0),
    발주기한: 시각(-3, 9, 0),
    매출: 430000,
    원가: 330000,
    페이백: 8000,
    할인: 8000,
    채널수수료율: 0,
    예약금확인: true,
    잔금확인: false,
    리마인드발송: true,
  },
  {
    id: "HD-260309-010",
    고객명: "유세진",
    채널: "네이버",
    제품: "클래식 볼 620",
    추가작업: "배수구 업그레이드",
    상태: "발주완료",
    기사: "윤소정",
    접수일시: 시각(-2, 9, 30),
    시공일시: 시각(2, 10, 30),
    발주기한: 시각(0, 9, 0),
    매출: 470000,
    원가: 300000,
    페이백: 15000,
    할인: 15000,
    채널수수료율: 0.055,
    예약금확인: true,
    잔금확인: false,
    리마인드발송: true,
  },
];

function 지표카드({
  라벨,
  값,
  보조텍스트,
  아이콘,
  그라데이션,
  트렌드,
}: {
  라벨: string;
  값: string | number;
  보조텍스트?: string;
  아이콘?: string;
  그라데이션?: string;
  트렌드?: { 값: string; 상승: boolean } | null;
}) {
  return (
    <div className="card-premium p-5 animate-fade-in-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">{라벨}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{값}</p>
          {보조텍스트 && (
            <p className="mt-1.5 text-xs text-[var(--color-text-muted)]">{보조텍스트}</p>
          )}
          {트렌드 && (
            <p className={`mt-1.5 text-xs font-medium ${
              트렌드.상승 ? "text-emerald-600" : "text-red-500"
            }`}>
              {트렌드.상승 ? "↑" : "↓"} {트렌드.값}
            </p>
          )}
        </div>
        {아이콘 && (
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
            style={{ background: 그라데이션 || "var(--kpi-sky)" }}
          >
            {아이콘}
          </div>
        )}
      </div>
    </div>
  );
}

export default function 홈대시보드페이지() {
  const [활성탭, set활성탭] = useState<대시보드탭>("ops");
  const [주문목록, set주문목록] = useState<주문레코드[]>(초기주문);
  const [완료알림, set완료알림] = useState<Set<string>>(new Set());
  const [완료이슈, set완료이슈] = useState<Set<string>>(new Set());
  const [정렬기준, set정렬기준] = useState<정렬키>("순수익");
  const [집중제품, set집중제품] = useState<Set<string>>(new Set());
  const [선택제품, set선택제품] = useState<string>("");

  const now = new Date();
  const 오늘 = 날짜키(now.toISOString());
  const 이번달 = 월키(now.toISOString());

  const 상태별건수 = useMemo(() => {
    return 상태순서.reduce(
      (acc, 상태) => {
        acc[상태] = 주문목록.filter((주문) => 주문.상태 === 상태).length;
        return acc;
      },
      {} as Record<주문상태, number>,
    );
  }, [주문목록]);

  const 저마진주문 = 주문목록.filter((주문) => 마진율(주문) < 0.1);
  const 미입금주문 = 주문목록.filter((주문) => {
    const 예약단계이상 = 상태인덱스(주문.상태) >= 상태인덱스("예약확정");
    const 시공완료이상 = 상태인덱스(주문.상태) >= 상태인덱스("시공완료");
    return 예약단계이상 && (!주문.예약금확인 || (시공완료이상 && !주문.잔금확인));
  });
  const 발주지연주문 = 주문목록.filter((주문) => {
    const 발주전 = 상태인덱스(주문.상태) < 상태인덱스("발주완료");
    return 발주전 && new Date(주문.발주기한).getTime() < now.getTime();
  });
  const 리마인드누락주문 = 주문목록.filter((주문) => {
    if (주문.상태 !== "예약확정" || 주문.리마인드발송) return false;
    const 남은시간 = (new Date(주문.시공일시).getTime() - now.getTime()) / 3600000;
    return 남은시간 <= 36 && 남은시간 >= -6;
  });

  const 알림목록: 알림카드[] = [
    {
      id: "저마진",
      제목: "저마진 위험 (10% 미만)",
      심각도: "높음",
      건수: 저마진주문.length,
      주문id목록: 저마진주문.map((주문) => 주문.id),
      액션라벨: "견적 재검토",
    },
    {
      id: "미입금",
      제목: "예약금/잔금 미입금",
      심각도: "높음",
      건수: 미입금주문.length,
      주문id목록: 미입금주문.map((주문) => 주문.id),
      액션라벨: "입금 매칭 처리",
    },
    {
      id: "발주지연",
      제목: "발주 지연",
      심각도: "중간",
      건수: 발주지연주문.length,
      주문id목록: 발주지연주문.map((주문) => 주문.id),
      액션라벨: "발주 완료 처리",
    },
    {
      id: "리마인드미발송",
      제목: "리마인드 미발송",
      심각도: "중간",
      건수: 리마인드누락주문.length,
      주문id목록: 리마인드누락주문.map((주문) => 주문.id),
      액션라벨: "리마인드 재발송",
    },
  ];

  const 미해결알림 = 알림목록.filter(
    (알림) => 알림.건수 > 0 && !완료알림.has(알림.id),
  );

  const 오늘접수 = 주문목록.filter((주문) => 날짜키(주문.접수일시) === 오늘).length;
  const 오늘시공완료 = 주문목록.filter(
    (주문) => 주문.상태 === "시공완료" && 날짜키(주문.시공일시) === 오늘,
  ).length;
  const 오늘정산완료 = 주문목록.filter(
    (주문) => 주문.상태 === "정산완료" && 날짜키(주문.시공일시) === 오늘,
  ).length;
  const 이번달순수익 = 주문목록
    .filter((주문) => 월키(주문.시공일시) === 이번달)
    .reduce((합, 주문) => 합 + 순수익(주문), 0);

  const 일정이슈목록 = useMemo<일정이슈[]>(() => {
    const 이슈: 일정이슈[] = [];

    const 동일슬롯맵 = new Map<string, 주문레코드[]>();
    for (const 주문 of 주문목록) {
      const 키 = `${주문.기사}-${주문.시공일시}`;
      const 기존 = 동일슬롯맵.get(키) ?? [];
      기존.push(주문);
      동일슬롯맵.set(키, 기존);
    }

    동일슬롯맵.forEach((목록) => {
      if (목록.length < 2 || 목록[0].기사 === "미배정") return;
      const 주문ids = 목록.map((주문) => 주문.id);
      이슈.push({
        id: `중복-${주문ids.join("-")}`,
        제목: "기사 중복 배정",
        심각도: "높음",
        설명: `${목록[0].기사} 기사 ${new Date(목록[0].시공일시).toLocaleString("ko-KR")}에 ${목록.length}건 배정`,
        주문id목록: 주문ids,
        액션라벨: "확인 완료",
        액션타입: "확인",
      });
    });

    for (const 주문 of 리마인드누락주문) {
      이슈.push({
        id: `리마인드-${주문.id}`,
        제목: "리마인드 누락",
        심각도: "중간",
        설명: `${주문.id} (${주문.고객명}) 건 알림 기록 없음`,
        주문id목록: [주문.id],
        액션라벨: "지금 재발송",
        액션타입: "재발송",
      });
    }

    const 내일키 = 날짜키(시각(1, now.getHours(), now.getMinutes()));
    const 내일주문 = 주문목록.filter((주문) => 날짜키(주문.시공일시) === 내일키);
    const 기사별건수 = new Map<string, number>();
    for (const 주문 of 내일주문) {
      기사별건수.set(주문.기사, (기사별건수.get(주문.기사) ?? 0) + 1);
    }

    기사별건수.forEach((건수, 기사명) => {
      if (기사명 === "미배정" || 건수 <= 2) return;
      const 대상주문 = 내일주문
        .filter((주문) => 주문.기사 === 기사명)
        .map((주문) => 주문.id);
      이슈.push({
        id: `과부하-${기사명}-${내일키}`,
        제목: "기사 과부하",
        심각도: "중간",
        설명: `${기사명} 기사 내일 ${건수}건 배정`,
        주문id목록: 대상주문,
        액션라벨: "확인 완료",
        액션타입: "확인",
      });
    });

    return 이슈;
  }, [주문목록, now, 리마인드누락주문]);

  const 미해결이슈 = 일정이슈목록.filter((이슈) => !완료이슈.has(이슈.id));

  const 제품지표목록 = useMemo<제품지표[]>(() => {
    const 맵 = new Map<string, 제품지표>();

    for (const 주문 of 주문목록) {
      const 기존 = 맵.get(주문.제품) ?? {
        제품: 주문.제품,
        주문수: 0,
        추가작업수: 0,
        매출: 0,
        순수익: 0,
        마진율: 0,
      };
      기존.주문수 += 1;
      기존.추가작업수 += 주문.추가작업 ? 1 : 0;
      기존.매출 += 주문.매출;
      기존.순수익 += 순수익(주문);
      맵.set(주문.제품, 기존);
    }

    const 목록 = Array.from(맵.values()).map((지표) => ({
      ...지표,
      마진율: 지표.매출 > 0 ? 지표.순수익 / 지표.매출 : 0,
    }));

    return 목록.sort((a, b) => {
      if (정렬기준 === "순수익") return b.순수익 - a.순수익;
      if (정렬기준 === "마진율") return b.마진율 - a.마진율;
      if (정렬기준 === "주문수") return b.주문수 - a.주문수;
      return b.매출 - a.매출;
    });
  }, [주문목록, 정렬기준]);

  const 현재선택제품 =
    제품지표목록.find((지표) => 지표.제품 === 선택제품) ?? 제품지표목록[0];
  const 제품최근주문 = 현재선택제품
    ? 주문목록.filter((주문) => 주문.제품 === 현재선택제품.제품).slice(0, 5)
    : [];

  function 알림처리(알림: 알림카드) {
    if (알림.id === "미입금") {
      const 대상 = new Set(알림.주문id목록);
      set주문목록((prev) =>
        prev.map((주문) =>
          대상.has(주문.id)
            ? { ...주문, 예약금확인: true, 잔금확인: true }
            : 주문,
        ),
      );
      return;
    }

    if (알림.id === "발주지연") {
      const 대상 = new Set(알림.주문id목록);
      set주문목록((prev) =>
        prev.map((주문) =>
          대상.has(주문.id) ? { ...주문, 상태: "발주완료" } : 주문,
        ),
      );
      return;
    }

    if (알림.id === "리마인드미발송") {
      const 대상 = new Set(알림.주문id목록);
      set주문목록((prev) =>
        prev.map((주문) =>
          대상.has(주문.id) ? { ...주문, 리마인드발송: true } : 주문,
        ),
      );
      return;
    }

    set완료알림((prev) => new Set([...prev, 알림.id]));
  }

  function 이슈처리(이슈: 일정이슈) {
    if (이슈.액션타입 === "재발송") {
      const 대상 = new Set(이슈.주문id목록);
      set주문목록((prev) =>
        prev.map((주문) =>
          대상.has(주문.id) ? { ...주문, 리마인드발송: true } : 주문,
        ),
      );
    }
    set완료이슈((prev) => new Set([...prev, 이슈.id]));
  }

  return (
    <div className="space-y-6">
      <header className="card-premium p-6 animate-fade-in-up">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">운영 대시보드</h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              운영 종합 · 일정 리스크 · 제품 수익성
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-xs text-[var(--color-text-muted)]">
              {new Date().toLocaleString("ko-KR")}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          {탭목록.map((탭) => {
            const icons = { ops: "🎯", schedule: "📅", profit: "💰" };
            return (
              <button
                key={탭.key}
                onClick={() => set활성탭(탭.key)}
                className={`rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                  활성탭 === 탭.key
                    ? "border-[var(--color-primary)] bg-blue-50 shadow-sm shadow-blue-100"
                    : "border-[var(--color-border)] bg-white hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                <p className="text-sm font-semibold">
                  <span className="mr-1.5">{icons[탭.key as keyof typeof icons]}</span>
                  {탭.라벨}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">{탭.설명}</p>
              </button>
            );
          })}
        </div>
      </header>

      {활성탭 === "ops" && (
        <section className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 stagger-children">
            <지표카드 라벨="오늘 접수" 값={오늘접수} 보조텍스트="오늘 생성된 접수/상담중" 아이콘="📥" 그라데이션="var(--kpi-sky)" 트렌드={{ 값: "전일 대비", 상승: true }} />
            <지표카드 라벨="오늘 시공완료" 값={오늘시공완료} 보조텍스트="오늘 완료된 작업" 아이콘="✅" 그라데이션="var(--kpi-mint)" />
            <지표카드 라벨="오늘 정산완료" 값={오늘정산완료} 보조텍스트="오늘 최종 정산 처리" 아이콘="💳" 그라데이션="var(--kpi-amber)" />
            <지표카드 라벨="이번 달 순수익" 값={KRW.format(이번달순수익)} 보조텍스트="당월 합계" 아이콘="💰" 그라데이션="var(--kpi-violet)" 트렌드={{ 값: "목표 대비 82%", 상승: true }} />
          </div>

          <div className="card-premium p-5 animate-fade-in-up">
            <h3 className="text-base font-semibold">진행 파이프라인</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6 stagger-children">
              {상태순서.map((상태, idx) => {
                const 색상목록 = [
                  "from-blue-50 to-blue-100 text-blue-700",
                  "from-sky-50 to-sky-100 text-sky-700",
                  "from-cyan-50 to-cyan-100 text-cyan-700",
                  "from-indigo-50 to-indigo-100 text-indigo-700",
                  "from-emerald-50 to-emerald-100 text-emerald-700",
                  "from-violet-50 to-violet-100 text-violet-700",
                ];
                const 전체 = 주문목록.length || 1;
                const 비율 = Math.round((상태별건수[상태] / 전체) * 100);
                return (
                  <div key={상태} className={`rounded-xl bg-gradient-to-br ${색상목록[idx]} p-3 transition-transform hover:scale-105`}>
                    <p className="text-xs font-medium opacity-70">{상태}</p>
                    <p className="mt-1 text-2xl font-bold">{상태별건수[상태]}</p>
                    <div className="mt-2 h-1 w-full rounded-full bg-black/5">
                      <div
                        className="h-1 rounded-full bg-current opacity-40 transition-all duration-500"
                        style={{ width: `${비율}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card-premium p-5 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🔔</span>
                <h3 className="text-base font-semibold">긴급 알림</h3>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">
                미해결 {미해결알림.length} / {알림목록.filter((알림) => 알림.건수 > 0).length}
              </span>
            </div>

            {미해결알림.length === 0 ? (
              <div className="mt-6 flex flex-col items-center py-4">
                <span className="text-3xl">🎉</span>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                  모든 알림이 해결되었습니다!
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3 stagger-children">
                {미해결알림.map((알림) => (
                  <div
                    key={알림.id}
                    className={`overflow-hidden rounded-xl border transition-all hover:shadow-sm ${
                      알림.심각도 === "높음"
                        ? "border-red-200 bg-red-50/50"
                        : "border-amber-200 bg-amber-50/50"
                    }`}
                  >
                    <div className="flex">
                      {/* 심각도 액센트 바 */}
                      <div className={`w-1 flex-shrink-0 ${
                        알림.심각도 === "높음" ? "bg-red-500" : "bg-amber-400"
                      }`} />
                      <div className="flex flex-1 flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              {알림.심각도 === "높음" ? "🚨" : "⚠️"}
                            </span>
                            <p className="text-sm font-semibold">{알림.제목}</p>
                          </div>
                          <p className="mt-1 pl-6 text-xs text-[var(--color-text-muted)]">
                            {알림.건수}건 · {알림.주문id목록.slice(0, 3).join(", ")}
                            {알림.주문id목록.length > 3 ? ` 외 ${알림.주문id목록.length - 3}건` : ""}
                          </p>
                        </div>
                        <button
                          onClick={() => 알림처리(알림)}
                          className="flex-shrink-0 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-[var(--color-primary)] shadow-sm ring-1 ring-[var(--color-primary)]/20 transition-all hover:bg-blue-50 hover:shadow"
                        >
                          {알림.액션라벨}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {활성탭 === "schedule" && (
        <section className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <지표카드 라벨="리스크 건수" 값={미해결이슈.length} />
            <지표카드 라벨="미발송 리마인드" 값={리마인드누락주문.length} />
            <지표카드
              라벨="내일 시공 건수"
              값={
                주문목록.filter(
                  (주문) =>
                    날짜키(주문.시공일시) ===
                    날짜키(시각(1, now.getHours(), now.getMinutes())),
                ).length
              }
            />
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-white p-5">
            <h3 className="text-base font-semibold">일정 리스크 큐</h3>
            {미해결이슈.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--color-text-muted)]">
                일정 리스크가 없습니다.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {미해결이슈.map((이슈) => (
                  <div
                    key={이슈.id}
                    className={`rounded-lg border p-4 ${
                      이슈.심각도 === "높음"
                        ? "border-red-200 bg-red-50"
                        : "border-sky-200 bg-sky-50"
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold">{이슈.제목}</p>
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                          {이슈.설명}
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                          주문: {이슈.주문id목록.join(", ")}
                        </p>
                      </div>
                      <button
                        onClick={() => 이슈처리(이슈)}
                        className="rounded-md bg-white px-3 py-2 text-xs font-medium text-[var(--color-primary)] ring-1 ring-[var(--color-primary)] hover:bg-blue-50"
                      >
                        {이슈.액션라벨}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {활성탭 === "profit" && (
        <section className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <지표카드 라벨="집계 제품 수" 값={제품지표목록.length} />
            <지표카드
              라벨="평균 마진율"
              값={퍼센트(
                제품지표목록.length === 0
                  ? 0
                  : 제품지표목록.reduce((합, 지표) => 합 + 지표.마진율, 0) /
                      제품지표목록.length,
              )}
            />
            <지표카드 라벨="집중 관리 제품" 값={집중제품.size} />
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-white p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-semibold">제품 수익성 순위</h3>
              <select
                value={정렬기준}
                onChange={(e) => set정렬기준(e.target.value as 정렬키)}
                className="rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
              >
                <option value="순수익">정렬: 순수익</option>
                <option value="마진율">정렬: 마진율</option>
                <option value="주문수">정렬: 주문 건수</option>
                <option value="매출">정렬: 매출</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
                    <th className="px-2 py-2">제품</th>
                    <th className="px-2 py-2">주문수</th>
                    <th className="px-2 py-2">매출</th>
                    <th className="px-2 py-2">순수익</th>
                    <th className="px-2 py-2">마진율</th>
                    <th className="px-2 py-2">추가작업 부착률</th>
                    <th className="px-2 py-2">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {제품지표목록.map((지표) => {
                    const 선택됨 = 현재선택제품?.제품 === 지표.제품;
                    const 집중됨 = 집중제품.has(지표.제품);
                    return (
                      <tr
                        key={지표.제품}
                        onClick={() => set선택제품(지표.제품)}
                        className={`cursor-pointer border-b border-[var(--color-border)] last:border-0 ${
                          선택됨 ? "bg-blue-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="px-2 py-3 font-medium">{지표.제품}</td>
                        <td className="px-2 py-3">{지표.주문수}</td>
                        <td className="px-2 py-3">{KRW.format(지표.매출)}</td>
                        <td className="px-2 py-3">{KRW.format(지표.순수익)}</td>
                        <td className="px-2 py-3">{퍼센트(지표.마진율)}</td>
                        <td className="px-2 py-3">
                          {퍼센트(지표.추가작업수 / 지표.주문수)}
                        </td>
                        <td className="px-2 py-3">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              set집중제품((prev) => {
                                const next = new Set(prev);
                                if (next.has(지표.제품)) next.delete(지표.제품);
                                else next.add(지표.제품);
                                return next;
                              });
                            }}
                            className={`rounded px-2 py-1 text-xs ${
                              집중됨
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {집중됨 ? "집중중" : "집중 설정"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {현재선택제품 && (
            <div className="rounded-xl border border-[var(--color-border)] bg-white p-5">
              <h3 className="text-base font-semibold">
                최근 주문: {현재선택제품.제품}
              </h3>
              <div className="mt-3 space-y-2">
                {제품최근주문.map((주문) => (
                  <div
                    key={주문.id}
                    className="flex flex-col gap-1 rounded-lg border border-[var(--color-border)] p-3 text-sm md:flex-row md:items-center md:justify-between"
                  >
                    <p>
                      {주문.id} · {주문.고객명} · {주문.상태}
                    </p>
                    <p className="text-[var(--color-text-muted)]">
                      {KRW.format(주문.매출)} / {퍼센트(마진율(주문))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
