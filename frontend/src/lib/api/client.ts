import type { ValidationErrorItem } from "@/lib/api/types";

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function formatValidationErrors(detail: ValidationErrorItem[]): string {
  return detail
    .map((item) => {
      const field = item.loc.filter((part) => part !== "body").join(".");
      return field ? `${field}: ${item.msg}` : item.msg;
    })
    .join("; ");
}

interface ApiErrorBody {
  detail?: unknown;
  error?: {
    code?: string;
    message?: string;
  };
}

async function parseErrorMessage(
  response: Response,
): Promise<{ message: string; code?: string }> {
  try {
    const data = (await response.json()) as ApiErrorBody;
    if (data.error?.message) {
      return {
        message: data.error.message,
        code: data.error.code,
      };
    }
    if (typeof data.detail === "string") {
      return { message: data.detail };
    }
    if (Array.isArray(data.detail)) {
      return { message: formatValidationErrors(data.detail as ValidationErrorItem[]) };
    }
  } catch {
    // Fall through to status text.
  }
  return { message: response.statusText || "Request failed" };
}

export async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const hasBody = options.body !== undefined && options.body !== null;

  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const { message, code } = await parseErrorMessage(response);
    throw new ApiError(message, response.status, code);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
