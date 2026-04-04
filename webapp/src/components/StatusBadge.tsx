import { OrderStatus } from "@/lib/types";

const statusConfig: Record<string, { bg: string; text: string }> = {
  접수: { bg: "bg-blue-100", text: "text-blue-700" },
  배정완료: { bg: "bg-yellow-100", text: "text-yellow-700" },
  시공중: { bg: "bg-orange-100", text: "text-orange-700" },
  완료: { bg: "bg-green-100", text: "text-green-700" },
  취소: { bg: "bg-red-100", text: "text-red-700" },
};

export default function StatusBadge({ status }: { status: OrderStatus }) {
  const config = statusConfig[status] ?? {
    bg: "bg-slate-100",
    text: "text-slate-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      {status}
    </span>
  );
}
