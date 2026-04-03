import { orders, technicians } from "@/data/mock";
import StatusBadge from "@/components/StatusBadge";
import Link from "next/link";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="text-lg text-[var(--color-text-muted)]">
          주문을 찾을 수 없습니다
        </p>
        <Link
          href="/orders"
          className="text-[var(--color-primary)] hover:underline mt-2 inline-block"
        >
          주문 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const tech = technicians.find((t) => t.id === order.technicianId);

  const timeline = [
    {
      label: "주문 접수",
      date: order.requestDate,
      done: true,
    },
    {
      label: "기사 배정",
      date: order.scheduledDate,
      done: ["배정완료", "시공중", "완료"].includes(order.status),
    },
    {
      label: "시공 진행",
      date: order.scheduledDate,
      done: ["시공중", "완료"].includes(order.status),
    },
    {
      label: "시공 완료",
      date: order.completedDate,
      done: order.status === "완료",
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/orders"
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          &larr; 주문 목록
        </Link>
        <span className="text-[var(--color-text-muted)]">/</span>
        <span className="font-mono text-sm">{order.id}</span>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* 주문 정보 */}
        <div className="col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">주문 상세</h2>
              <StatusBadge status={order.status} />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[var(--color-text-muted)] mb-1">고객명</p>
                <p className="font-medium">{order.customerName}</p>
              </div>
              <div>
                <p className="text-[var(--color-text-muted)] mb-1">연락처</p>
                <p className="font-medium">{order.phone}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[var(--color-text-muted)] mb-1">주소</p>
                <p className="font-medium">{order.address}</p>
              </div>
              <div>
                <p className="text-[var(--color-text-muted)] mb-1">
                  싱크볼 타입
                </p>
                <p className="font-medium">{order.sinkType}</p>
              </div>
              <div>
                <p className="text-[var(--color-text-muted)] mb-1">시공 금액</p>
                <p className="font-medium text-lg">
                  {order.price.toLocaleString()}원
                </p>
              </div>
              {order.notes && (
                <div className="col-span-2">
                  <p className="text-[var(--color-text-muted)] mb-1">메모</p>
                  <p className="bg-slate-50 rounded-lg p-3">{order.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* 진행 상태 타임라인 */}
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
            <h3 className="font-semibold mb-4">진행 상태</h3>
            <div className="flex items-center gap-0">
              {timeline.map((step, i) => (
                <div key={step.label} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        step.done
                          ? "bg-[var(--color-primary)] text-white"
                          : "bg-slate-200 text-[var(--color-text-muted)]"
                      }`}
                    >
                      {step.done ? "✓" : i + 1}
                    </div>
                    <p
                      className={`text-xs mt-2 ${step.done ? "font-medium" : "text-[var(--color-text-muted)]"}`}
                    >
                      {step.label}
                    </p>
                    {step.date && (
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {step.date}
                      </p>
                    )}
                  </div>
                  {i < timeline.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 ${step.done ? "bg-[var(--color-primary)]" : "bg-slate-200"}`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 담당 기사 정보 */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
            <h3 className="font-semibold mb-4">담당 기사</h3>
            {tech ? (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-lg">
                    🔧
                  </div>
                  <div>
                    <p className="font-medium">{tech.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {tech.region}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">
                      연락처
                    </span>
                    <span>{tech.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">
                      누적 시공
                    </span>
                    <span>{tech.completedTotal}건</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-muted)]">평점</span>
                    <span>⭐ {tech.rating}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">
                아직 배정된 기사가 없습니다
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
            <h3 className="font-semibold mb-3">일정</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">접수일</span>
                <span>{order.requestDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">시공일</span>
                <span>{order.scheduledDate || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">완료일</span>
                <span>{order.completedDate || "-"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
