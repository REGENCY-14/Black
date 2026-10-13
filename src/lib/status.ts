import { Ban, CheckCircle2, Clock, PackageCheck, Plane, Search, Truck, type LucideIcon } from "lucide-react";
import type { Order, OrderStatus, ProgressStep } from "@/lib/api/types";

export type StatusTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

export interface StatusMeta {
  label: string;
  /** Short plain-language explanation shown to customers. */
  meaning: string;
  icon: LucideIcon;
  tone: StatusTone;
}

/** The single source of truth for status copy. Never write status strings in components. */
export const statusMeta: Record<OrderStatus, StatusMeta> = {
  confirmed: {
    label: "Confirmed",
    meaning: "We have your payment and your preorder is in.",
    icon: CheckCircle2,
    tone: "info",
  },
  sourcing: {
    label: "Sourcing",
    meaning: "We are buying your items from the factory in China.",
    icon: Search,
    tone: "info",
  },
  shipped_from_china: {
    label: "Shipped from China",
    meaning: "Your goods are on the way to Ghana in the container.",
    icon: Plane,
    tone: "info",
  },
  arrived_in_ghana: {
    label: "Arrived in Ghana",
    meaning: "The container has landed. We are preparing your order.",
    icon: PackageCheck,
    tone: "accent",
  },
  out_for_delivery: {
    label: "Out for delivery",
    meaning: "Your order is with the rider. Delivery is arranged directly with them.",
    icon: Truck,
    tone: "accent",
  },
  delivered: {
    label: "Delivered",
    meaning: "Your order has been delivered. Enjoy.",
    icon: CheckCircle2,
    tone: "success",
  },
  delayed: {
    label: "Delayed",
    meaning: "Your order is taking longer than planned. Your place in the queue is safe.",
    icon: Clock,
    tone: "warning",
  },
  cancelled: {
    label: "Cancelled",
    meaning: "This order was cancelled.",
    icon: Ban,
    tone: "neutral",
  },
};

/** The six timeline steps, in order. */
export const progressSteps: ProgressStep[] = [
  "confirmed",
  "sourcing",
  "shipped_from_china",
  "arrived_in_ghana",
  "out_for_delivery",
  "delivered",
];

export function stepIndex(step: ProgressStep): number {
  return progressSteps.indexOf(step);
}

export function nextStep(step: ProgressStep): ProgressStep | null {
  return progressSteps[stepIndex(step) + 1] ?? null;
}

export function isProgressStep(status: OrderStatus): status is ProgressStep {
  return status !== "delayed" && status !== "cancelled";
}

/** Customers may request cancellation only before the goods ship from China (client decision Q8-A). */
export function canRequestCancellation(order: Pick<Order, "status" | "step">): boolean {
  return order.status !== "cancelled" && stepIndex(order.step) < stepIndex("shipped_from_china");
}

export function isAwaitingPayment(order: Pick<Order, "paidMinor">): boolean {
  return order.paidMinor === 0;
}

export function balanceMinor(order: Pick<Order, "totalMinor" | "paidMinor">): number {
  return Math.max(0, order.totalMinor - order.paidMinor);
}

export function hasBalanceDue(order: Pick<Order, "totalMinor" | "paidMinor" | "status">): boolean {
  return order.status !== "cancelled" && order.paidMinor > 0 && balanceMinor(order) > 0;
}
