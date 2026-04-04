"use client";

import { useState } from "react";
import Link from "next/link";
import { technicians as initialTechs, orders as initialOrders } from "@/data/mock";
import { Order, Technician } from "@/lib/types";
import { STORAGE_KEYS, usePersistentState } from "@/lib/persistence";

type ReminderChannel = "kakao" | "sms";

export default function TechniciansPage() {
  const [technicians, setTechnicians] = usePersistentState<Technician[]>(
    STORAGE_KEYS.technicians,
    initialTechs,
  );
  const [orders] = usePersistentState<Order[]>(STORAGE_KEYS.orders, initialOrders);
  const [showModal, setShowModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [newTech, setNewTech] = useState({
    name: "",
    phone: "",
    region: "",
  });
  const [selectedReminderTechId, setSelectedReminderTechId] = useState("");
  const [selectedReminderOrderId, setSelectedReminderOrderId] = useState("");
  const [selectedReminderChannel, setSelectedReminderChannel] = useState<ReminderChannel>("kakao");
  const [extraReminderNotes, setExtraReminderNotes] = useState("");
  const [reminderNotice, setReminderNotice] = useState("");
  const [reminderNoticeType, setReminderNoticeType] = useState<"success" | "error">("success");

  function toggleAvailability(id: string) {
    setTechnicians(
      technicians.map((t) =>
        t.id === id ? { ...t, available: !t.available } : t,
      ),
    );
  }

  function handleAddTech() {
    const tech: Technician = {
      id: `tech-${technicians.length + 1}`,
      ...newTech,
      available: true,
      activeOrders: 0,
      completedTotal: 0,
      rating: 0,
    };
    setTechnicians([...technicians, tech]);
    setShowModal(false);
    setNewTech({ name: "", phone: "", region: "" });
  }

  function getTechOrders(techId: string) {
    return orders.filter(
      (o) =>
        o.technicianId === techId &&
        o.status !== "완료" &&
        o.status !== "취소",
    );
  }

  function getTechCompletedCount(techId: string) {
    return orders.filter((o) => o.technicianId === techId && o.status === "완료").length;
  }

  function getReminderOrdersByTech(techId: string) {
    return orders
      .filter(
        (o) =>
          o.technicianId === techId &&
          !!o.scheduledDate &&
          o.status !== "완료" &&
          o.status !== "취소",
      )
      .sort((a, b) => (a.scheduledDate || "").localeCompare(b.scheduledDate || ""));
  }

  function openReminderModal() {
    const techWithOrders = technicians.find((tech) => getReminderOrdersByTech(tech.id).length > 0);
    const initialTechId = techWithOrders?.id || technicians[0]?.id || "";
    const initialOrderId = initialTechId ? getReminderOrdersByTech(initialTechId)[0]?.id || "" : "";

    setSelectedReminderTechId(initialTechId);
    setSelectedReminderOrderId(initialOrderId);
    setSelectedReminderChannel("kakao");
    setExtraReminderNotes("");
    setReminderNotice("");
    setReminderNoticeType("success");
    setShowReminderModal(true);
  }

  const reminderTech = technicians.find((tech) => tech.id === selectedReminderTechId) || null;
  const reminderOrders = selectedReminderTechId ? getReminderOrdersByTech(selectedReminderTechId) : [];
  const reminderOrder = orders.find((order) => order.id === selectedReminderOrderId) || null;

  const reminderMessage = reminderOrder
    ? [
        "[기사 일정 리마인드]",
        `시공 일정: ${[reminderOrder.scheduledDate, reminderOrder.requestedInstallTime].filter(Boolean).join(" ") || "-"}`,
        `고객명: ${reminderOrder.customerName || "-"}`,
        `고객주소: ${reminderOrder.address || "-"}`,
        `제품명: ${reminderOrder.productName?.trim() || reminderOrder.sinkType || "-"}`,
        `기타 공유 사항: ${extraReminderNotes.trim() || reminderOrder.notes?.trim() || "-"}`,
      ].join("\n")
    : "";

  async function handleSendReminder() {
    if (!reminderTech || !reminderOrder || !reminderMessage) return;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(reminderMessage);
      }
    } catch {
      // clipboard 복사는 지원되지 않을 수 있어 메시지 발송 동작은 계속 진행
    }

    if (selectedReminderChannel === "sms") {
      const smsUrl = `sms:${reminderTech.phone}?body=${encodeURIComponent(reminderMessage)}`;
      window.location.href = smsUrl;
      setReminderNoticeType("success");
      setReminderNotice("리마인드 메시지를 복사했고 문자앱 발송 화면으로 이동했습니다.");
      return;
    }

    try {
      const response = await fetch("/api/reminders/kakao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          technicianName: reminderTech.name,
          technicianPhone: reminderTech.phone,
          scheduleDate: reminderOrder.scheduledDate || "",
          scheduleTime: reminderOrder.requestedInstallTime || "",
          customerName: reminderOrder.customerName || "",
          customerAddress: reminderOrder.address || "",
          productName: reminderOrder.productName?.trim() || reminderOrder.sinkType || "",
          sharedNotes: extraReminderNotes.trim() || reminderOrder.notes?.trim() || "",
          message: reminderMessage,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setReminderNoticeType("error");
        setReminderNotice(result.error || "카카오톡 리마인드 발송에 실패했습니다.");
        return;
      }

      setReminderNoticeType("success");
      setReminderNotice(result.message || "카카오톡 리마인드를 발송했습니다.");
    } catch {
      setReminderNoticeType("error");
      setReminderNotice("카카오톡 리마인드 발송 중 네트워크 오류가 발생했습니다.");
    }
  }

  return (
    <div>
      <div className="card-premium p-5 mb-6 animate-fade-in-up">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">기사 관리</h2>
            <p className="text-[var(--color-text-muted)] text-sm mt-1">
              총 {technicians.length}명 · 가용 {technicians.filter((t) => t.available).length}명
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openReminderModal}
              className="px-4 py-2.5 border border-[var(--color-border)] bg-white rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all"
            >
              기사 일정 리마인드
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--color-primary-dark)] shadow-sm shadow-blue-200 transition-all"
            >
              + 기사 등록
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 stagger-children">
        {technicians.map((tech) => {
          const techOrders = getTechOrders(tech.id);
          const completedCount = getTechCompletedCount(tech.id);
          const gradients = [
            "from-blue-500 to-blue-600",
            "from-emerald-500 to-emerald-600",
            "from-violet-500 to-violet-600",
            "from-amber-500 to-amber-600",
            "from-rose-500 to-rose-600",
          ];
          const idx = technicians.indexOf(tech);
          const gradient = gradients[idx % gradients.length];

          return (
            <div
              key={tech.id}
              className="card-premium p-5 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 bg-gradient-to-br ${gradient} rounded-full flex items-center justify-center text-lg text-white font-bold shadow-sm`}
                  >
                    {tech.name.charAt(0)}
                  </div>
                  <div>
                    <Link
                      href={`/technicians/${tech.id}`}
                      className="font-semibold hover:text-[var(--color-primary)] hover:underline underline-offset-2"
                    >
                      {tech.name}
                    </Link>
                    <p className="text-xs text-[var(--color-text-muted)]">{tech.region}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleAvailability(tech.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    tech.available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                  }`}
                >
                  {tech.available ? "가용" : "불가"}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-blue-50 rounded-xl p-2.5 text-center">
                  <p className="text-lg font-bold text-blue-700">{techOrders.length}</p>
                  <p className="text-[10px] text-blue-600/60 font-medium">진행중</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-2.5 text-center">
                  <p className="text-lg font-bold text-emerald-700">{completedCount}</p>
                  <p className="text-[10px] text-emerald-600/60 font-medium">완료건</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-2.5 text-center">
                  <p className="text-lg font-bold text-amber-700">{tech.rating > 0 ? tech.rating : "-"}</p>
                  <p className="text-[10px] text-amber-600/60 font-medium">평점</p>
                </div>
              </div>

              <div className="text-sm text-[var(--color-text-muted)] mb-3">📞 {tech.phone}</div>

              {techOrders.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">배정된 주문</p>
                  <div className="space-y-2">
                    {techOrders.map((order) => (
                      <div key={order.id} className="bg-slate-50 rounded-lg p-2 text-xs">
                        <div className="flex justify-between">
                          {order.status === "시공중" ? (
                            <Link
                              href={`/orders/${order.id}`}
                              className="font-medium hover:text-[var(--color-primary)] hover:underline underline-offset-2"
                              title="주문 상세 보기"
                            >
                              {order.customerName}
                            </Link>
                          ) : (
                            <span className="font-medium">{order.customerName}</span>
                          )}
                          <span className={order.status === "시공중" ? "text-orange-600" : "text-blue-600"}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-[var(--color-text-muted)] truncate mt-0.5">{order.address}</p>
                        {order.scheduledDate && (
                          <p className="text-[var(--color-text-muted)] mt-0.5">📅 {order.scheduledDate}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-[420px] overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="px-6 py-5 border-b border-[var(--color-border)]">
              <h3 className="text-lg font-bold">새 기사 등록</h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  이름 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className="w-full border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                  value={newTech.name}
                  onChange={(e) => setNewTech({ ...newTech, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  연락처 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="010-0000-0000"
                  className="w-full border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                  value={newTech.phone}
                  onChange={(e) => setNewTech({ ...newTech, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  담당 지역 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="서울 강남/서초"
                  className="w-full border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                  value={newTech.region}
                  onChange={(e) => setNewTech({ ...newTech, region: e.target.value })}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[var(--color-border)] bg-slate-50/50 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 text-sm border border-[var(--color-border)] rounded-xl hover:bg-white transition-colors font-medium"
              >
                취소
              </button>
              <button
                onClick={handleAddTech}
                disabled={!newTech.name || !newTech.phone || !newTech.region}
                className="px-5 py-2.5 text-sm bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary-dark)] disabled:opacity-40 font-semibold shadow-sm shadow-blue-200 transition-all"
              >
                등록
              </button>
            </div>
          </div>
        </div>
      )}

      {showReminderModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-[640px] max-h-[90vh] overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="px-6 py-5 border-b border-[var(--color-border)]">
              <h3 className="text-lg font-bold">기사 일정 리마인드</h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                기사에게 보낼 리마인드 메시지를 확인하고 발송하세요.
              </p>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">발송 채널</label>
                  <select
                    className="w-full border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                    value={selectedReminderChannel}
                    onChange={(e) => {
                      setSelectedReminderChannel(e.target.value as ReminderChannel);
                      setReminderNotice("");
                    }}
                  >
                    <option value="kakao">카카오톡 (알림톡 연동)</option>
                    <option value="sms">문자 (SMS)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">기사 선택</label>
                  <select
                    className="w-full border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                    value={selectedReminderTechId}
                    onChange={(e) => {
                      const nextTechId = e.target.value;
                      const nextOrders = getReminderOrdersByTech(nextTechId);
                      setSelectedReminderTechId(nextTechId);
                      setSelectedReminderOrderId(nextOrders[0]?.id || "");
                      setReminderNotice("");
                      setReminderNoticeType("success");
                    }}
                  >
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.name} ({tech.region})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">시공 일정 선택</label>
                  <select
                    className="w-full border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                    value={selectedReminderOrderId}
                    onChange={(e) => {
                      setSelectedReminderOrderId(e.target.value);
                      setReminderNotice("");
                      setReminderNoticeType("success");
                    }}
                    disabled={reminderOrders.length === 0}
                  >
                    {reminderOrders.length === 0 ? (
                      <option value="">발송 가능한 일정이 없습니다</option>
                    ) : (
                      reminderOrders.map((order) => (
                        <option key={order.id} value={order.id}>
                          {order.scheduledDate} · {order.customerName} · {order.status}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">기타 공유 사항</label>
                <textarea
                  className="w-full border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                  placeholder="예: 현장 주차 불가, 오전 10시 전 연락 필요"
                  value={extraReminderNotes}
                  onChange={(e) => {
                    setExtraReminderNotes(e.target.value);
                    setReminderNotice("");
                    setReminderNoticeType("success");
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">리마인드 메시지 미리보기</label>
                <pre className="bg-slate-50 border border-[var(--color-border)] rounded-xl p-3 text-xs whitespace-pre-wrap leading-relaxed">
                  {reminderMessage || "발송 가능한 일정이 없습니다."}
                </pre>
              </div>

              {reminderNotice && (
                <div
                  className={`text-xs rounded-lg p-2.5 border ${
                    reminderNoticeType === "error"
                      ? "text-red-700 bg-red-50 border-red-200"
                      : "text-emerald-700 bg-emerald-50 border-emerald-200"
                  }`}
                >
                  {reminderNotice}
                </div>
              )}

              {reminderTech && (
                <p className="text-xs text-[var(--color-text-muted)]">
                  발송 대상 연락처: {reminderTech.phone}
                </p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[var(--color-border)] bg-slate-50/50 flex justify-end gap-3">
              <button
                onClick={() => setShowReminderModal(false)}
                className="px-4 py-2.5 text-sm border border-[var(--color-border)] rounded-xl hover:bg-white transition-colors font-medium"
              >
                닫기
              </button>
              <button
                onClick={handleSendReminder}
                disabled={!reminderTech || !reminderOrder || !reminderMessage}
                className="px-5 py-2.5 text-sm bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary-dark)] disabled:opacity-40 font-semibold shadow-sm shadow-blue-200 transition-all"
              >
                {selectedReminderChannel === "kakao" ? "카카오톡 리마인드 발송" : "문자 리마인드 발송"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
