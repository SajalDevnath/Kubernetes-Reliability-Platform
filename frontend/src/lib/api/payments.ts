import { apiRequest } from "@/lib/api/client";
import type {
  Payment,
  PaymentCreateInput,
  PaymentUpdateInput,
} from "@/lib/api/types";

const PAYMENTS_BASE = "/api/payments";

export async function listPayments(): Promise<Payment[]> {
  return apiRequest<Payment[]>(PAYMENTS_BASE);
}

export async function getPayment(paymentId: number): Promise<Payment> {
  return apiRequest<Payment>(`${PAYMENTS_BASE}/${paymentId}`);
}

export async function createPayment(input: PaymentCreateInput): Promise<Payment> {
  return apiRequest<Payment>(PAYMENTS_BASE, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updatePayment(
  paymentId: number,
  input: PaymentUpdateInput,
): Promise<Payment> {
  return apiRequest<Payment>(`${PAYMENTS_BASE}/${paymentId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deletePayment(paymentId: number): Promise<void> {
  await apiRequest<void>(`${PAYMENTS_BASE}/${paymentId}`, {
    method: "DELETE",
  });
}
