"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import { orders as initialOrders, technicians as initialTechnicians } from "@/data/mock";
import { STORAGE_KEYS, usePersistentState } from "@/lib/persistence";
import { Order, Technician } from "@/lib/types";

function sortByDateDesc(a: Order, b: Order) {
  const aDate = a.completedDate || a.scheduledDate || a.requestDate;
  const bDate = b.completedDate || b.scheduledDate || b.requestDate;
  return bDate.localeCompare(aDate);
}

export default function TechnicianDetailPage() {
  const params = useParams<{ id: string }>();
  const technicianId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [technicians] = usePersistentState<Technician[]>(
    STORAGE_KEYS.technicians,
    initialTechnicians,
  );
  const [orders] = usePersistentState<Order[]>(STORAGE_KEYS.orders, initialOrders);

  const technician = technicians.find((tech) => tech.id === technicianId);

  if (!technician) {
    return (
      <div className="text-center py-20">
        <p className="text-lg text-[var(--color-text-muted)]">기사를 찾을 수 없습니다</p>
        <Link
          href="/technicians"
          className="text-[var(--color-primary)] hover:underline mt-2 inline-block"
        >
          기사 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const technicianOrders = orders.filter((order) => order.technicianId === technicianId);
  const inProgressOrders = technicianOrders
    .filter((order) => order.status === "시공중")
    .sort(sortByDateDesc);
  const assignedOrders = technicianOrders
    .filter((order) => order.status === "배정완료")
    .sort(sortByDateDesc);
  const completedOrders = technicianOrders
    .filter((order) => order.status === "완료")
    .sort(sortByDateDesc)
    .slice(0, 5);

  const activeOrderCount = technicianOrders.filter(
    (order) => order.status !== "완료" && order.status !== "취소",
  ).length;
  const completedRevenue = technicianOrders
    .filter((order) => order.status === "완료")
    .reduce((sum, order) => sum + order.price, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/technicians"
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          &larr; 기사 목록
        </Link>
        <span className="text-[var(--color-text-muted)]">/</span>
        <span className="font-medium">{technician.name}</span>
      </div>

      <div className="card-premium p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{technician.name}</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">{technician.region}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              technician.available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
            }`}
          >
            {technician.available ? "가용" : "불가"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
          <div className="rounded-xl bg-blue-50 p-3">
            <p className="text-xs text-blue-600/70">진행중 주문</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">{activeOrderCount}</p>
          </div>
          <div className="rounded-xl bg-orange-50 p-3">
            <p className="text-xs text-orange-600/70">시공중</p>
            <p className="mt-1 text-2xl font-bold text-orange-700">{inProgressOrders.length}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 p-3">
            <p className="text-xs text-emerald-600/70">완료 누적 매출</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">
              {completedRevenue.toLocaleString()}원
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="card-premium p-5">
            <h3 className="text-base font-semibold">시공중 고객</h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              고객명을 클릭하면 주문 상세로 이동합니다.
            </p>

            {inProgressOrders.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] mt-4">시공중인 고객이 없습니다.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {inProgressOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="block rounded-lg border border-orange-200 bg-orange-50/50 p-3 hover:bg-orange-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-orange-800 hover:underline underline-offset-2">
                          {order.customerName}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">{order.address}</p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">
                          주문번호 {order.id} · 시공일 {order.scheduledDate || "-"}
                        </p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="card-premium p-5">
            <h3 className="text-base font-semibold">배정완료 고객</h3>
            {assignedOrders.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] mt-4">배정완료 주문이 없습니다.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {assignedOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="block rounded-lg bg-slate-50 p-3 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{order.customerName}</p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">{order.address}</p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">
                          주문번호 {order.id} · 시공일 {order.scheduledDate || "-"}
                        </p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="card-premium p-5">
            <h3 className="text-base font-semibold">기사 정보</h3>
            <div className="space-y-2 text-sm mt-4">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">연락처</span>
                <span>{technician.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">담당 지역</span>
                <span>{technician.region}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">평점</span>
                <span>{technician.rating > 0 ? `⭐ ${technician.rating}` : "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">완료 건수</span>
                <span>{technicianOrders.filter((order) => order.status === "완료").length}건</span>
              </div>
            </div>
          </div>

          <div className="card-premium p-5">
            <h3 className="text-base font-semibold">최근 완료 주문</h3>
            {completedOrders.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] mt-4">완료된 주문이 없습니다.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {completedOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="block rounded-lg bg-emerald-50/60 p-3 hover:bg-emerald-50 transition-colors"
                  >
                    <p className="text-sm font-medium">{order.customerName}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">
                      {order.completedDate || "-"} · {order.price.toLocaleString()}원
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
