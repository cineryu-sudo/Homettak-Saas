"use client";

import { useMemo, useState } from "react";
import { orders as initialOrders, technicians as initialTechnicians } from "@/data/mock";
import { Order, Technician } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import { STORAGE_KEYS, usePersistentState } from "@/lib/persistence";

const TECH_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  "tech-1": { bg: "bg-blue-50", border: "border-l-blue-500", text: "text-blue-700", dot: "bg-blue-500" },
  "tech-2": { bg: "bg-emerald-50", border: "border-l-emerald-500", text: "text-emerald-700", dot: "bg-emerald-500" },
  "tech-3": { bg: "bg-violet-50", border: "border-l-violet-500", text: "text-violet-700", dot: "bg-violet-500" },
  "tech-4": { bg: "bg-amber-50", border: "border-l-amber-500", text: "text-amber-700", dot: "bg-amber-500" },
  "tech-5": { bg: "bg-rose-50", border: "border-l-rose-500", text: "text-rose-700", dot: "bg-rose-500" },
};

const DAY_NAMES = ["월", "화", "수", "목", "금", "토", "일"];
type CalendarViewMode = "day" | "week" | "month";

function getColor(techId: string | null) {
  return (
    TECH_COLORS[techId || ""] || {
      bg: "bg-slate-50",
      border: "border-l-slate-400",
      text: "text-slate-700",
      dot: "bg-slate-400",
    }
  );
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(base.getDate() + days);
  return next;
}

function startOfWeekMonday(base: Date) {
  const dayIndex = (base.getDay() + 6) % 7;
  return addDays(base, -dayIndex);
}

function getDateRangeLabel(viewMode: CalendarViewMode, dates: Date[]) {
  if (viewMode === "day") {
    const day = dates[0];
    return `${day.getFullYear()}년 ${day.getMonth() + 1}월 ${day.getDate()}일`;
  }

  if (viewMode === "week") {
    const start = dates[0];
    const end = dates[dates.length - 1];
    return `${start.getMonth() + 1}/${start.getDate()} ~ ${end.getMonth() + 1}/${end.getDate()}`;
  }

  const firstDay = dates.find((d) => d.getDate() === 1) || dates[0];
  return `${firstDay.getFullYear()}년 ${firstDay.getMonth() + 1}월`;
}

export default function SchedulePage() {
  const [orders, setOrders] = usePersistentState<Order[]>(
    STORAGE_KEYS.orders,
    initialOrders,
  );
  const [technicians] = usePersistentState<Technician[]>(
    STORAGE_KEYS.technicians,
    initialTechnicians,
  );
  const [viewMode, setViewMode] = useState<CalendarViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  const [quickAssign, setQuickAssign] = useState<Record<string, { techId: string; date: string }>>({});

  const todayStr = formatDateKey(new Date());

  const visibleDates = useMemo(() => {
    if (viewMode === "day") {
      return [new Date(currentDate)];
    }

    if (viewMode === "week") {
      const start = startOfWeekMonday(currentDate);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }

    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startShift = (monthStart.getDay() + 6) % 7;
    const gridStart = addDays(monthStart, -startShift);
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [currentDate, viewMode]);

  const scheduledOrders = orders.filter((o) => o.scheduledDate && o.technicianId);

  const unassignedOrders = orders.filter(
    (o) => !o.technicianId && (o.status === "접수" || o.status === "배정완료"),
  );

  const visibleDateSet = useMemo(
    () => new Set(visibleDates.map((d) => formatDateKey(d))),
    [visibleDates],
  );

  function getOrdersForDate(dateStr: string) {
    const filtered = scheduledOrders.filter((o) => o.scheduledDate === dateStr);
    if (selectedTech) {
      return filtered.filter((o) => o.technicianId === selectedTech);
    }
    return filtered;
  }

  const viewStats = useMemo(() => {
    const rangeOrders = scheduledOrders.filter((o) => o.scheduledDate && visibleDateSet.has(o.scheduledDate));
    return {
      total: rangeOrders.length,
      inProgress: rangeOrders.filter((o) => o.status === "시공중").length,
      completed: rangeOrders.filter((o) => o.status === "완료").length,
      techCount: new Set(rangeOrders.map((o) => o.technicianId)).size,
    };
  }, [scheduledOrders, visibleDateSet]);

  function getDraft(orderId: string) {
    const existing = quickAssign[orderId];
    if (existing) return existing;
    const firstAvailable = technicians.find((t) => t.available)?.id || "";
    return {
      techId: selectedTech || firstAvailable,
      date: todayStr,
    };
  }

  function updateDraft(orderId: string, patch: Partial<{ techId: string; date: string }>) {
    const base = getDraft(orderId);
    setQuickAssign((prev) => ({
      ...prev,
      [orderId]: {
        ...base,
        ...patch,
      },
    }));
  }

  function handleQuickAssign(orderId: string) {
    const draft = getDraft(orderId);
    if (!draft.techId || !draft.date) return;

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              technicianId: draft.techId,
              scheduledDate: draft.date,
              status: o.status === "접수" ? "배정완료" : o.status,
            }
          : o,
      ),
    );

    setQuickAssign((prev) => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
  }

  function moveRange(direction: -1 | 1) {
    if (viewMode === "day") {
      setCurrentDate((prev) => addDays(prev, direction));
      return;
    }

    if (viewMode === "week") {
      setCurrentDate((prev) => addDays(prev, direction * 7));
      return;
    }

    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
  }

  const summaryTitle = viewMode === "day" ? "오늘 요약" : viewMode === "week" ? "이번 주 요약" : "이번 달 요약";
  const dateLabel = getDateRangeLabel(viewMode, visibleDates);
  const columnCountClass = viewMode === "day" ? "grid-cols-1" : "grid-cols-7";
  const monthAnchorMonth = currentDate.getMonth();

  return (
    <div className="flex gap-5">
      <div className="w-52 flex-shrink-0 space-y-4">
        <div className="card-premium p-4 animate-fade-in-up">
          <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
            기사 필터
          </h3>
          <button
            onClick={() => setSelectedTech(null)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-all ${
              !selectedTech
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-[var(--color-text-muted)] hover:bg-slate-50"
            }`}
          >
            전체 기사
          </button>
          <div className="space-y-1">
            {technicians.map((tech) => {
              const color = getColor(tech.id);
              const techOrderCount = scheduledOrders.filter(
                (o) => o.technicianId === tech.id && o.scheduledDate && visibleDateSet.has(o.scheduledDate),
              ).length;

              return (
                <button
                  key={tech.id}
                  onClick={() => setSelectedTech(selectedTech === tech.id ? null : tech.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                    selectedTech === tech.id
                      ? `${color.bg} ${color.text} font-medium shadow-sm`
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${color.dot} ${
                        tech.available ? "" : "opacity-30"
                      }`}
                    />
                    <span className="text-sm">{tech.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 ml-4">
                    <span className="text-[10px] text-[var(--color-text-muted)]">{tech.region}</span>
                    {techOrderCount > 0 && (
                      <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded-full font-medium">
                        {techOrderCount}건
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="card-premium p-4 animate-fade-in-up">
          <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
            {summaryTitle}
          </h3>
          <div className="space-y-2">
            {[
              { label: "전체 일정", value: viewStats.total, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "시공중", value: viewStats.inProgress, color: "text-orange-600", bg: "bg-orange-50" },
              { label: "완료", value: viewStats.completed, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "투입 기사", value: viewStats.techCount, color: "text-violet-600", bg: "bg-violet-50" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`flex items-center justify-between px-3 py-2 rounded-lg ${bg}`}>
                <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
                <span className={`text-sm font-bold ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-4">
        <div className="card-premium p-5 animate-fade-in-up">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">일정 관리</h2>
              <p className="text-[var(--color-text-muted)] text-sm mt-1">
                일/주/월 시공 일정 전환 · 기사별 필터
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-[var(--color-border)] overflow-hidden">
                {[
                  { key: "day", label: "일" },
                  { key: "week", label: "주" },
                  { key: "month", label: "월" },
                ].map((mode) => (
                  <button
                    key={mode.key}
                    onClick={() => setViewMode(mode.key as CalendarViewMode)}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${
                      viewMode === mode.key
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-white text-[var(--color-text-muted)] hover:bg-slate-50"
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => moveRange(-1)}
                className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm hover:bg-slate-50 transition-colors font-medium"
              >
                ← 이전
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-dark)] shadow-sm shadow-blue-200 transition-all"
              >
                오늘
              </button>
              <button
                onClick={() => moveRange(1)}
                className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm hover:bg-slate-50 transition-colors font-medium"
              >
                다음 →
              </button>
              <div className="ml-3 text-right">
                <p className="text-sm font-semibold">{dateLabel}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card-premium overflow-hidden animate-fade-in-up">
          <div className={`grid ${columnCountClass} divide-x divide-[var(--color-border)]`}>
            {visibleDates.map((day, i) => {
              const dateStr = formatDateKey(day);
              const dayOrders = getOrdersForDate(dateStr);
              const isToday = dateStr === todayStr;
              const weekDayIdx = (day.getDay() + 6) % 7;
              const isWeekend = weekDayIdx >= 5;
              const isOutsideMonth = viewMode === "month" && day.getMonth() !== monthAnchorMonth;

              return (
                <div key={dateStr} className={viewMode === "month" ? "min-h-[180px]" : "min-h-[340px]"}>
                  <div
                    className={`px-3 py-3 text-center border-b transition-colors ${
                      isToday
                        ? "bg-blue-50 border-b-blue-200"
                        : isWeekend
                          ? "bg-red-50/50"
                          : "bg-slate-50/80"
                    } ${isOutsideMonth ? "opacity-50" : ""}`}
                  >
                    <p
                      className={`text-[10px] uppercase tracking-wider font-medium ${
                        isToday ? "text-blue-500" : isWeekend ? "text-red-400" : "text-[var(--color-text-muted)]"
                      }`}
                    >
                      {DAY_NAMES[weekDayIdx]}
                    </p>
                    <p
                      className={`text-lg font-bold mt-0.5 ${
                        isToday ? "text-blue-600" : isWeekend ? "text-red-400" : ""
                      }`}
                    >
                      {day.getDate()}
                    </p>
                    {dayOrders.length > 0 && (
                      <div className="flex justify-center gap-0.5 mt-1">
                        {dayOrders.slice(0, 3).map((o) => (
                          <span
                            key={o.id}
                            className={`inline-block h-1.5 w-1.5 rounded-full ${getColor(o.technicianId).dot}`}
                          />
                        ))}
                        {dayOrders.length > 3 && (
                          <span className="text-[8px] text-[var(--color-text-muted)] ml-0.5">+{dayOrders.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className={`p-1.5 ${viewMode === "month" ? "space-y-1" : "space-y-1.5"}`}>
                    {dayOrders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-[var(--color-text-muted)]">
                        <span className="text-lg opacity-30">??</span>
                        <p className="text-[10px] mt-1 opacity-50">일정 없음</p>
                      </div>
                    ) : (
                      dayOrders.map((order, orderIdx) => {
                        if (viewMode === "month" && orderIdx > 1) {
                          return null;
                        }

                        const tech = technicians.find((t) => t.id === order.technicianId);
                        const color = getColor(order.technicianId);

                        return (
                          <div
                            key={order.id}
                            className={`p-2 rounded-lg text-[11px] border-l-[3px] ${color.bg} ${color.border} hover:shadow-sm transition-all cursor-default group`}
                          >
                            <div className="flex justify-between items-start">
                              <span className={`font-semibold ${color.text}`}>{order.customerName}</span>
                              <StatusBadge status={order.status} />
                            </div>
                            <p className="text-[var(--color-text-muted)] mt-0.5 truncate">{order.sinkType}</p>
                            {tech && (
                              <p className="text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1">
                                <span className={`inline-block h-1.5 w-1.5 rounded-full ${color.dot}`} />
                                {tech.name}
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                    {viewMode === "month" && dayOrders.length > 2 && (
                      <p className="px-2 text-[10px] text-[var(--color-text-muted)]">+{dayOrders.length - 2}건 더보기</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="w-72 flex-shrink-0">
        <div className="card-premium p-4 animate-fade-in-up sticky top-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
              미배정 주문
            </h3>
            <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
              {unassignedOrders.length}
            </span>
          </div>

          {unassignedOrders.length === 0 ? (
            <div className="text-center py-6">
              <span className="text-2xl">?</span>
              <p className="text-xs text-[var(--color-text-muted)] mt-2">모든 주문이 배정되었습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {unassignedOrders.map((order) => {
                const draft = getDraft(order.id);
                return (
                  <div
                    key={order.id}
                    className="p-3 rounded-lg border border-dashed border-amber-300 bg-amber-50/30 hover:bg-amber-50 hover:border-amber-400 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <p className="text-xs font-semibold">{order.customerName}</p>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-1 truncate">
                      {order.sinkType} · {order.address.split(" ").slice(0, 2).join(" ")}
                    </p>
                    <p className="text-[10px] font-medium text-amber-600 mt-1">{order.price.toLocaleString()}원</p>

                    <div className="mt-2.5 space-y-2">
                      <select
                        className="w-full text-xs border border-[var(--color-border)] rounded-lg px-2 py-1.5 bg-white"
                        value={draft.techId}
                        onChange={(e) => updateDraft(order.id, { techId: e.target.value })}
                      >
                        <option value="">기사 선택</option>
                        {technicians
                          .filter((t) => t.available)
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.region})
                            </option>
                          ))}
                      </select>
                      <input
                        type="date"
                        className="w-full text-xs border border-[var(--color-border)] rounded-lg px-2 py-1.5 bg-white"
                        value={draft.date}
                        onChange={(e) => updateDraft(order.id, { date: e.target.value })}
                      />
                      <button
                        onClick={() => handleQuickAssign(order.id)}
                        disabled={!draft.techId || !draft.date}
                        className="w-full text-xs px-3 py-2 rounded-lg bg-amber-100 text-amber-700 font-semibold disabled:opacity-40"
                      >
                        즉시 배정
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 rounded-lg bg-slate-50 p-2.5">
            <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
              우측 패널에서 기사와 시공일을 선택하면 배정완료까지 즉시 반영됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

