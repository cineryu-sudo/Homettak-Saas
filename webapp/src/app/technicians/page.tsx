"use client";

import { useState } from "react";
import { technicians as initialTechs, orders as initialOrders } from "@/data/mock";
import { Order, Technician } from "@/lib/types";
import { STORAGE_KEYS, usePersistentState } from "@/lib/persistence";

export default function TechniciansPage() {
  const [technicians, setTechnicians] = usePersistentState<Technician[]>(
    STORAGE_KEYS.technicians,
    initialTechs,
  );
  const [orders] = usePersistentState<Order[]>(STORAGE_KEYS.orders, initialOrders);
  const [showModal, setShowModal] = useState(false);
  const [newTech, setNewTech] = useState({
    name: "",
    phone: "",
    region: "",
  });

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
        (o.status === "배정완료" || o.status === "시공중"),
    );
  }

  function getTechCompletedCount(techId: string) {
    return orders.filter((o) => o.technicianId === techId && o.status === "완료").length;
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
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--color-primary-dark)] shadow-sm shadow-blue-200 transition-all"
          >
            + 기사 등록
          </button>
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
                    <p className="font-semibold">{tech.name}</p>
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
                          <span className="font-medium">{order.customerName}</span>
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
    </div>
  );
}
