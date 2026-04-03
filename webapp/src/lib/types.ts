export type OrderStatus = "접수" | "배정완료" | "시공중" | "완료" | "취소";

export type SinkType =
  | "언더싱크볼"
  | "오버싱크볼"
  | "일체형싱크볼"
  | "사각싱크볼"
  | "원형싱크볼";

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  sinkType: SinkType;
  status: OrderStatus;
  requestDate: string;
  scheduledDate: string | null;
  completedDate: string | null;
  technicianId: string | null;
  notes: string;
  price: number;
}

export interface Technician {
  id: string;
  name: string;
  phone: string;
  region: string;
  available: boolean;
  activeOrders: number;
  completedTotal: number;
  rating: number;
}

export interface ScheduleEvent {
  id: string;
  orderId: string;
  technicianId: string;
  date: string;
  timeSlot: string;
  customerName: string;
  address: string;
  status: OrderStatus;
}
