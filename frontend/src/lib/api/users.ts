import { apiRequest } from "@/lib/api/client";
import type {
  HealthResponse,
  User,
  UserCreateInput,
  UserUpdateInput,
} from "@/lib/api/types";

const USERS_BASE = "/api/users";
const USER_HEALTH = "/api/health/user";

export async function listUsers(): Promise<User[]> {
  return apiRequest<User[]>(USERS_BASE);
}

export async function getUser(userId: number): Promise<User> {
  return apiRequest<User>(`${USERS_BASE}/${userId}`);
}

export async function createUser(input: UserCreateInput): Promise<User> {
  return apiRequest<User>(USERS_BASE, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateUser(
  userId: number,
  input: UserUpdateInput,
): Promise<User> {
  return apiRequest<User>(`${USERS_BASE}/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteUser(userId: number): Promise<void> {
  await apiRequest<void>(`${USERS_BASE}/${userId}`, {
    method: "DELETE",
  });
}

export async function getUserServiceHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>(USER_HEALTH);
}
