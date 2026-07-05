const API_BASE_URL = `${
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
}/api/auth`;

export type AuthUser = {
  id?: number;
  email: string;
  name?: string;
  tier: "free" | "pro";
  actionsUsed?: number;
  actionsLimit?: number;
  emailVerified?: boolean;
  authProvider?: "email" | "google";
  createdAt?: string;
};

type RegisterPayload = {
  name?: string;
  email: string;
  password: string;
};

type LoginPayload = {
  email: string;
  password: string;
};

type VerifyEmailCodePayload = {
  email: string;
  code: string;
};

type ForgotPasswordPayload = {
  email: string;
};

type ResetPasswordPayload = {
  email: string;
  code: string;
  newPassword: string;
};

type GoogleLoginPayload = {
  credential: string;
};

type AuthResponse = {
  success: boolean;
  message?: string;
  token?: string;
  user?: AuthUser;
  requiresVerification?: boolean;
};

type UsageResponse = {
  success: boolean;
  message?: string;
  usage?: {
    tier: "free" | "pro";
    actionsUsed: number;
    actionsLimit: number;
    remaining: number;
  };
};

type AdminUserResponse = {
  success: boolean;
  message?: string;
  user?: AuthUser;
};

const TOKEN_KEY = "pdfdoer_auth_token";
const USER_KEY = "pdfdoer_user";

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "Request failed.");
  }

  return data as T;
}

export function saveAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveUser(user: AuthUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getSavedUser(): AuthUser | null {
  const saved = localStorage.getItem(USER_KEY);

  if (!saved) return null;

  try {
    return JSON.parse(saved);
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function logoutUser() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function saveAuthData(data: AuthResponse) {
  if (data.token) {
    saveAuthToken(data.token);
  }

  if (data.user) {
    saveUser(data.user);
  }
}

export async function registerUser(payload: RegisterPayload) {
  const data = await request<AuthResponse>("/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  saveAuthData(data);

  return data;
}

export async function loginUser(payload: LoginPayload) {
  const data = await request<AuthResponse>("/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  saveAuthData(data);

  return data;
}

export async function googleLoginUser(payload: GoogleLoginPayload) {
  const data = await request<AuthResponse>("/google-login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  saveAuthData(data);

  return data;
}

export async function verifyEmailCode(payload: VerifyEmailCodePayload) {
  const data = await request<AuthResponse>("/verify-email-code", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  saveAuthData(data);

  return data;
}

export async function resendVerificationCode(email: string) {
  return request<AuthResponse>("/resend-verification-code", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function forgotPassword(payload: ForgotPasswordPayload) {
  return request<AuthResponse>("/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resetPassword(payload: ResetPasswordPayload) {
  return request<AuthResponse>("/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getCurrentUser() {
  const data = await request<AuthResponse>("/me", {
    method: "GET",
  });

  if (data.user) {
    saveUser(data.user);
  }

  return data;
}

export async function getUsage() {
  return request<UsageResponse>("/usage", {
    method: "GET",
  });
}

export async function incrementUsage() {
  return request<UsageResponse>("/increment-usage", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function adminUpgradeUser(email: string) {
  return request<AdminUserResponse>("/admin/upgrade-user", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function adminDowngradeUser(email: string) {
  return request<AdminUserResponse>("/admin/downgrade-user", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function getGuestUsage() {
  return request<UsageResponse>("/guest-usage", {
    method: "GET",
  });
}

export async function incrementGuestUsage() {
  return request<UsageResponse>("/guest-increment-usage", {
    method: "POST",
    body: JSON.stringify({}),
  });
}