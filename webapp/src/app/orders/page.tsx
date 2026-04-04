"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { orders as initialOrders, technicians as initialTechnicians } from "@/data/mock";
import { Order, OrderStatus, SinkType, Technician } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import { STORAGE_KEYS, usePersistentState } from "@/lib/persistence";

const SINK_TYPES: SinkType[] = [
  "언더싱크볼",
  "오버싱크볼",
  "일체형싱크볼",
  "사각싱크볼",
  "원형싱크볼",
];

export default function OrdersPage() {
  const [orders, setOrders] = usePersistentState<Order[]>(
    STORAGE_KEYS.orders,
    initialOrders,
  );
  const [technicians] = usePersistentState<Technician[]>(
    STORAGE_KEYS.technicians,
    initialTechnicians,
  );
  const [filterStatus, setFilterStatus] = useState<OrderStatus | "전체">(
    "전체",
  );
  const [showModal, setShowModal] = useState(false);
  const [showParseModal, setShowParseModal] = useState(false);
  const [parseText, setParseText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [aiFilledFields, setAiFilledFields] = useState<Set<string>>(new Set());
  const [newOrder, setNewOrder] = useState({
    customerName: "",
    phone: "",
    address: "",
    productName: "",
    requestedInstallDate: "",
    requestedInstallTime: "",
    sinkType: "언더싱크볼" as SinkType,
    notes: "",
    price: 350000,
  });

  const todayStr = new Date().toISOString().split("T")[0];

  const filtered =
    filterStatus === "전체"
      ? orders
      : orders.filter((o) => o.status === filterStatus);

  const statusTabs: (OrderStatus | "전체")[] = [
    "전체",
    "접수",
    "배정완료",
    "시공중",
    "완료",
    "취소",
  ];

  const todoStats = useMemo(() => {
    const unassigned = orders.filter(
      (o) => !o.technicianId && o.status !== "완료" && o.status !== "취소",
    );
    const unscheduled = orders.filter(
      (o) =>
        !!o.technicianId &&
        !o.scheduledDate &&
        o.status !== "완료" &&
        o.status !== "취소",
    );
    const waitingStart = orders.filter(
      (o) => o.status === "배정완료" && o.scheduledDate === todayStr,
    );
    const inProgress = orders.filter((o) => o.status === "시공중");

    return { unassigned, unscheduled, waitingStart, inProgress };
  }, [orders, todayStr]);

  /* ── 대화 텍스트 → AI 파싱 → 주문 폼 자동 채우기 ── */
  async function handleParseText() {
    if (!parseText.trim()) return;
    setParsing(true);
    setParseError("");

    try {
      const res = await fetch("/api/parse-customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: parseText }),
      });
      const json = await res.json();

      if (!res.ok) {
        setParseError(json.error || "파싱에 실패했습니다");
        return;
      }

      const d = json.data;
      const validSink = SINK_TYPES.includes(d.sinkType)
        ? d.sinkType
        : "언더싱크볼";

      const filled = new Set<string>();
      if (d.customerName) filled.add("customerName");
      if (d.phone) filled.add("phone");
      if (d.address) filled.add("address");
      if (d.requestedInstallDate) filled.add("requestedInstallDate");
      if (d.requestedInstallTime) filled.add("requestedInstallTime");
      if (d.sinkType) filled.add("sinkType");
      if (d.notes) filled.add("notes");
      if (d.price && Number(d.price) > 0) filled.add("price");
      setAiFilledFields(filled);

      setNewOrder({
        customerName: d.customerName || "",
        phone: d.phone || "",
        address: d.address || "",
        productName: "",
        requestedInstallDate: d.requestedInstallDate || "",
        requestedInstallTime: d.requestedInstallTime || "",
        sinkType: validSink,
        notes: d.notes || "",
        price: Number(d.price) || 350000,
      });

      setShowParseModal(false);
      setParseText("");
      setShowModal(true);
    } catch {
      setParseError("서버 연결에 실패했습니다");
    } finally {
      setParsing(false);
    }
  }

  function handleAddOrder() {
    const requestMeta = [
      newOrder.productName ? `제품: ${newOrder.productName}` : "",
      newOrder.requestedInstallDate
        ? `설치요청일: ${newOrder.requestedInstallDate}`
        : "",
      newOrder.requestedInstallTime
        ? `설치요청시간: ${newOrder.requestedInstallTime}`
        : "",
    ]
      .filter(Boolean)
      .join(" / ");

    const mergedNotes =
      requestMeta && newOrder.notes
        ? `${requestMeta}\n${newOrder.notes}`
        : requestMeta || newOrder.notes;

    const order: Order = {
      id: `ORD-2026-${String(orders.length + 1).padStart(3, "0")}`,
      ...newOrder,
      status: "접수",
      requestDate: todayStr,
      requestedInstallDate: newOrder.requestedInstallDate || null,
      requestedInstallTime: newOrder.requestedInstallTime || null,
      scheduledDate: null,
      completedDate: null,
      technicianId: null,
      notes: mergedNotes,
    };
    setOrders([order, ...orders]);
    setShowModal(false);
    setAiFilledFields(new Set());
    setNewOrder({
      customerName: "",
      phone: "",
      address: "",
      productName: "",
      requestedInstallDate: "",
      requestedInstallTime: "",
      sinkType: "언더싱크볼",
      notes: "",
      price: 350000,
    });
  }

  function handleAssign(orderId: string, techId: string) {
    setOrders(
      orders.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          technicianId: techId || null,
        };
      }),
    );
  }

  function handleScheduleDate(orderId: string, scheduledDate: string) {
    setOrders(
      orders.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          scheduledDate: scheduledDate || null,
        };
      }),
    );
  }

  function handleConfirmAssignment(orderId: string) {
    setOrders(
      orders.map((o) => {
        if (o.id !== orderId) return o;
        if (!o.technicianId || !o.scheduledDate) return o;
        return {
          ...o,
          status: "배정완료",
        };
      }),
    );
  }

  function handleStatusChange(orderId: string, status: OrderStatus) {
    setOrders(
      orders.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          status,
          completedDate: status === "완료" ? todayStr : o.completedDate,
        };
      }),
    );
  }

  function handleBulkStartToday() {
    setOrders(
      orders.map((o) =>
        o.status === "배정완료" && o.scheduledDate === todayStr
          ? { ...o, status: "시공중" as OrderStatus }
          : o,
      ),
    );
  }

  function handleBulkCompleteInProgress() {
    setOrders(
      orders.map((o) =>
        o.status === "시공중"
          ? { ...o, status: "완료" as OrderStatus, completedDate: todayStr }
          : o,
      ),
    );
  }

  return (
    <div>
      <div className="card-premium p-5 mb-6 animate-fade-in-up">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">주문 관리</h2>
            <p className="text-[var(--color-text-muted)] text-sm mt-1">
              총 {orders.length}건 · 오늘 접수 {orders.filter((o) => o.requestDate === todayStr).length}건
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowParseModal(true);
                setParseError("");
              }}
              className="group flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-blue-300 text-[var(--color-primary)] rounded-xl text-sm font-semibold hover:bg-blue-50 hover:border-blue-400 transition-all"
            >
              <span className="text-base group-hover:animate-pulse">✨</span>
              AI 자동 입력
            </button>
            <button
              onClick={() => {
                setAiFilledFields(new Set());
                setShowModal(true);
              }}
              className="px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--color-primary-dark)] shadow-sm shadow-blue-200 transition-all"
            >
              + 새 주문 등록
            </button>
          </div>
        </div>
      </div>

      <div className="card-premium p-5 mb-5 animate-fade-in-up">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">오늘 해야 할 일</h3>
          <p className="text-xs text-[var(--color-text-muted)]">{todayStr} 기준 운영 액션</p>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
            <p className="text-xs text-[var(--color-text-muted)]">미배정 주문</p>
            <p className="text-2xl font-bold mt-1 text-amber-700">{todoStats.unassigned.length}</p>
            <button
              onClick={() => setFilterStatus("접수")}
              className="mt-2 text-xs font-semibold text-amber-700 hover:underline"
            >
              접수 목록 보기
            </button>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3">
            <p className="text-xs text-[var(--color-text-muted)]">일정 미입력</p>
            <p className="text-2xl font-bold mt-1 text-blue-700">{todoStats.unscheduled.length}</p>
            <p className="mt-2 text-xs text-blue-700">기사는 있지만 시공일 없음</p>
          </div>
          <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-3">
            <p className="text-xs text-[var(--color-text-muted)]">오늘 시공 시작 대기</p>
            <p className="text-2xl font-bold mt-1 text-orange-700">{todoStats.waitingStart.length}</p>
            <button
              onClick={handleBulkStartToday}
              disabled={todoStats.waitingStart.length === 0}
              className="mt-2 text-xs px-2.5 py-1 rounded-md bg-orange-100 text-orange-700 font-semibold disabled:opacity-40"
            >
              일괄 시공시작
            </button>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
            <p className="text-xs text-[var(--color-text-muted)]">시공중 완료처리</p>
            <p className="text-2xl font-bold mt-1 text-emerald-700">{todoStats.inProgress.length}</p>
            <button
              onClick={handleBulkCompleteInProgress}
              disabled={todoStats.inProgress.length === 0}
              className="mt-2 text-xs px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-700 font-semibold disabled:opacity-40"
            >
              일괄 완료처리
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-5 stagger-children">
        {statusTabs.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
              filterStatus === s
                ? "bg-[var(--color-primary)] text-white shadow-sm shadow-blue-200"
                : "bg-white border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-slate-50 hover:border-slate-300"
            }`}
          >
            {s}
            {s !== "전체" && (
              <span className="ml-1 opacity-70">({orders.filter((o) => o.status === s).length})</span>
            )}
          </button>
        ))}
      </div>

      <div className="card-premium overflow-hidden animate-fade-in-up">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 text-[var(--color-text-muted)]">
              <th className="text-left px-5 py-3.5 font-medium text-xs uppercase tracking-wide">주문번호</th>
              <th className="text-left px-5 py-3.5 font-medium text-xs uppercase tracking-wide">고객</th>
              <th className="text-left px-5 py-3.5 font-medium text-xs uppercase tracking-wide">주소</th>
              <th className="text-left px-5 py-3.5 font-medium text-xs uppercase tracking-wide">싱크볼</th>
              <th className="text-left px-5 py-3.5 font-medium text-xs uppercase tracking-wide">담당기사</th>
              <th className="text-left px-5 py-3.5 font-medium text-xs uppercase tracking-wide">시공일</th>
              <th className="text-left px-5 py-3.5 font-medium text-xs uppercase tracking-wide">상태</th>
              <th className="text-right px-5 py-3.5 font-medium text-xs uppercase tracking-wide">금액</th>
              <th className="text-center px-5 py-3.5 font-medium text-xs uppercase tracking-wide">액션</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((order, idx) => (
              <tr
                key={order.id}
                className="border-t border-[var(--color-border)] hover:bg-blue-50/30 transition-colors"
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                <td className="px-5 py-3.5">
                  <Link
                    href={`/orders/${order.id}`}
                    className="font-mono text-xs text-[var(--color-primary)] hover:underline font-medium"
                  >
                    {order.id}
                  </Link>
                </td>
                <td className="px-5 py-3.5">
                  <p className="font-medium">{order.customerName}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{order.phone}</p>
                </td>
                <td className="px-5 py-3.5 max-w-[220px] truncate text-xs text-[var(--color-text-muted)]">
                  {order.address}
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-md">{order.sinkType}</span>
                </td>
                <td className="px-5 py-3.5">
                  {order.status === "완료" || order.status === "취소" ? (
                    <span className="text-sm text-[var(--color-text-muted)]">
                      {order.technicianId ? technicians.find((t) => t.id === order.technicianId)?.name : "-"}
                    </span>
                  ) : (
                    <select
                      className="text-xs border border-[var(--color-border)] rounded-lg px-2 py-1.5 bg-white transition-colors hover:border-blue-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none"
                      value={order.technicianId || ""}
                      onChange={(e) => handleAssign(order.id, e.target.value)}
                    >
                      <option value="">기사 선택</option>
                      {technicians
                        .filter((t) => t.available || t.id === order.technicianId)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.region})
                          </option>
                        ))}
                    </select>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  {order.status === "완료" || order.status === "취소" ? (
                    <span className="text-xs text-[var(--color-text-muted)]">{order.scheduledDate || "-"}</span>
                  ) : (
                    <input
                      type="date"
                      className="text-xs border border-[var(--color-border)] rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none"
                      value={order.scheduledDate || ""}
                      onChange={(e) => handleScheduleDate(order.id, e.target.value)}
                    />
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-5 py-3.5 text-right font-medium">{order.price.toLocaleString()}원</td>
                <td className="px-5 py-3.5 text-center">
                  {order.status === "접수" && (
                    <button
                      onClick={() => handleConfirmAssignment(order.id)}
                      disabled={!order.technicianId || !order.scheduledDate}
                      className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 transition-colors disabled:opacity-40"
                    >
                      배정확정
                    </button>
                  )}
                  {order.status === "배정완료" && (
                    <button
                      onClick={() => handleStatusChange(order.id, "시공중")}
                      className="text-xs px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 font-medium hover:bg-orange-100 transition-colors"
                    >
                      시공시작
                    </button>
                  )}
                  {order.status === "시공중" && (
                    <button
                      onClick={() => handleStatusChange(order.id, "완료")}
                      className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 font-medium hover:bg-emerald-100 transition-colors"
                    >
                      완료처리
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showParseModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-[600px] max-h-[90vh] overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="px-6 py-5 border-b border-[var(--color-border)] bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-lg">
                  ✨
                </div>
                <div>
                  <h3 className="text-lg font-bold">AI 자동 입력</h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    고객 대화 내용을 붙여넣으면 AI가 주문 정보를 자동 추출합니다
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="relative">
                <textarea
                  className="w-full border-2 border-[var(--color-border)] rounded-xl px-4 py-3 text-sm h-52 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all bg-slate-50/50"
                  placeholder={"예시) 카카오톡 대화 내용 붙여넣기:\n\n고객: 안녕하세요, 싱크볼 교체 문의드립니다.\n이름은 김민수이고 연락처는 010-9876-5432입니다.\n주소는 서울시 강남구 역삼동 123-4 현대아파트 501호.\n언더싱크볼로 교체하고 싶습니다.\n가격은 35만원이라고 하셨죠? 오전 시공 부탁드립니다."}
                  value={parseText}
                  onChange={(e) => setParseText(e.target.value)}
                />
                {parseText && (
                  <div className="absolute top-3 right-3">
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                      {parseText.length}자
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                <span className="text-sm mt-0.5">💡</span>
                <div className="text-xs text-[var(--color-text-muted)] space-y-1">
                  <p>카카오톡, 문자, 전화 받은 내용을 그대로 붙여넣으세요.</p>
                  <p>
                    AI가 <strong>고객명, 연락처, 주소, 설치 요청일/시간, 싱크볼 타입, 가격</strong>을 자동으로 추출합니다.
                  </p>
                  <p>제품명은 수기 입력으로 관리됩니다.</p>
                </div>
              </div>

              {parseError && (
                <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  <span>🚨</span> {parseError}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[var(--color-border)] bg-slate-50/50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowParseModal(false);
                  setParseText("");
                  setParseError("");
                }}
                className="px-4 py-2.5 text-sm border border-[var(--color-border)] rounded-xl hover:bg-white transition-colors font-medium"
              >
                취소
              </button>
              <button
                onClick={handleParseText}
                disabled={!parseText.trim() || parsing}
                className="px-5 py-2.5 text-sm bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-40 flex items-center gap-2 font-semibold shadow-sm shadow-blue-200 transition-all"
              >
                {parsing ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    분석중...
                  </>
                ) : (
                  <>🤖 고객 정보 추출</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-[520px] max-h-[90vh] overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="px-6 py-5 border-b border-[var(--color-border)]">
              <h3 className="text-lg font-bold">새 주문 등록</h3>
            </div>

            <div className="px-6 py-5 overflow-y-auto" style={{ maxHeight: "calc(90vh - 160px)" }}>
              {aiFilledFields.size > 0 && (
                <div className="mb-5 flex items-start gap-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4">
                  <span className="text-lg mt-0.5">🤖</span>
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">
                      AI가 {aiFilledFields.size}개 필드를 자동 입력했습니다
                    </p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      초록색 테두리 필드가 AI 자동 입력입니다. 확인 후 수정하세요.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {[
                  { key: "customerName", label: "고객명", required: true, placeholder: undefined },
                  { key: "phone", label: "연락처", required: true, placeholder: "010-0000-0000" },
                  { key: "address", label: "주소", required: true, placeholder: undefined },
                ].map(({ key, label, required, placeholder }) => (
                  <div key={key}>
                    <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                      {label} {required && <span className="text-red-400">*</span>}
                      {aiFilledFields.has(key) && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-medium">AI</span>
                      )}
                    </label>
                    <input
                      type="text"
                      placeholder={placeholder}
                      className={`w-full rounded-xl px-3.5 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 ${
                        aiFilledFields.has(key)
                          ? "border-2 border-emerald-300 bg-emerald-50/30 focus:ring-emerald-400 focus:border-emerald-400"
                          : "border border-[var(--color-border)] focus:ring-blue-400 focus:border-blue-400"
                      }`}
                      value={newOrder[key as keyof typeof newOrder] as string}
                      onChange={(e) => setNewOrder({ ...newOrder, [key]: e.target.value })}
                    />
                  </div>
                ))}

                <div>
                  <label className="text-sm font-medium mb-1.5 block">제품명 (수기 입력)</label>
                  <input
                    type="text"
                    placeholder="예: 백조 거니 9830 + 카시미어 G7"
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm border border-[var(--color-border)] focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none"
                    value={newOrder.productName}
                    onChange={(e) => setNewOrder({ ...newOrder, productName: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                      설치 요청일
                      {aiFilledFields.has("requestedInstallDate") && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-medium">AI</span>
                      )}
                    </label>
                    <input
                      type="date"
                      className={`w-full rounded-xl px-3.5 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 ${
                        aiFilledFields.has("requestedInstallDate")
                          ? "border-2 border-emerald-300 bg-emerald-50/30 focus:ring-emerald-400"
                          : "border border-[var(--color-border)] focus:ring-blue-400"
                      }`}
                      value={newOrder.requestedInstallDate}
                      onChange={(e) => setNewOrder({ ...newOrder, requestedInstallDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                      설치 요청시간
                      {aiFilledFields.has("requestedInstallTime") && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-medium">AI</span>
                      )}
                    </label>
                    <input
                      type="time"
                      className={`w-full rounded-xl px-3.5 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 ${
                        aiFilledFields.has("requestedInstallTime")
                          ? "border-2 border-emerald-300 bg-emerald-50/30 focus:ring-emerald-400"
                          : "border border-[var(--color-border)] focus:ring-blue-400"
                      }`}
                      value={newOrder.requestedInstallTime}
                      onChange={(e) => setNewOrder({ ...newOrder, requestedInstallTime: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                    싱크볼 타입
                    {aiFilledFields.has("sinkType") && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-medium">AI</span>
                    )}
                  </label>
                  <select
                    className={`w-full rounded-xl px-3.5 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 ${
                      aiFilledFields.has("sinkType")
                        ? "border-2 border-emerald-300 bg-emerald-50/30 focus:ring-emerald-400"
                        : "border border-[var(--color-border)] focus:ring-blue-400"
                    }`}
                    value={newOrder.sinkType}
                    onChange={(e) => setNewOrder({ ...newOrder, sinkType: e.target.value as SinkType })}
                  >
                    {SINK_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                    시공 금액 (원)
                    {aiFilledFields.has("price") && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-medium">AI</span>
                    )}
                  </label>
                  <input
                    type="number"
                    className={`w-full rounded-xl px-3.5 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 ${
                      aiFilledFields.has("price")
                        ? "border-2 border-emerald-300 bg-emerald-50/30 focus:ring-emerald-400"
                        : "border border-[var(--color-border)] focus:ring-blue-400"
                    }`}
                    value={newOrder.price}
                    onChange={(e) => setNewOrder({ ...newOrder, price: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                    메모
                    {aiFilledFields.has("notes") && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-medium">AI</span>
                    )}
                  </label>
                  <textarea
                    className={`w-full rounded-xl px-3.5 py-2.5 text-sm h-20 resize-none transition-all focus:outline-none focus:ring-2 ${
                      aiFilledFields.has("notes")
                        ? "border-2 border-emerald-300 bg-emerald-50/30 focus:ring-emerald-400"
                        : "border border-[var(--color-border)] focus:ring-blue-400"
                    }`}
                    value={newOrder.notes}
                    onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[var(--color-border)] bg-slate-50/50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setAiFilledFields(new Set());
                  setNewOrder({
                    customerName: "",
                    phone: "",
                    address: "",
                    productName: "",
                    requestedInstallDate: "",
                    requestedInstallTime: "",
                    sinkType: "언더싱크볼",
                    notes: "",
                    price: 350000,
                  });
                }}
                className="px-4 py-2.5 text-sm border border-[var(--color-border)] rounded-xl hover:bg-white transition-colors font-medium"
              >
                취소
              </button>
              <button
                onClick={handleAddOrder}
                disabled={!newOrder.customerName || !newOrder.phone || !newOrder.address}
                className="px-5 py-2.5 text-sm bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary-dark)] disabled:opacity-40 font-semibold shadow-sm shadow-blue-200 transition-all"
              >
                등록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
