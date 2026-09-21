import { apiRequest } from "@/lib/api/client";
import type { Order, OrderCreateInput, OrderUpdateInput } from "@/lib/api/types";

const ORDERS_BASE = "/api/orders";

export async function listOrders(): Promise<Order[]> {
  return apiRequest<Order[]>(ORDERS_BASE);
}

export async function getOrder(orderId: number): Promise<Order> {
  return apiRequest<Order>(`${ORDERS_BASE}/${orderId}`);
}

export async function createOrder(input: OrderCreateInput): Promise<Order> {
  return apiRequest<Order>(ORDERS_BASE, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateOrder(
  orderId: number,
  input: OrderUpdateInput,
): Promise<Order> {
  return apiRequest<Order>(`${ORDERS_BASE}/${orderId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteOrder(orderId: number): Promise<void> {
  await apiRequest<void>(`${ORDERS_BASE}/${orderId}`, {
    method: "DELETE",
  });
}
