const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type Tokens = {
  accessToken: string;
  refreshToken: string;
};

function getAccessToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

function getRefreshToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}

export function setTokens(tokens: Tokens) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
}

export function clearTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

async function tryRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Tokens;
  setTokens(data);
  return data.accessToken;
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  headers.set('Content-Type', 'application/json');

  let res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    const newToken = await tryRefresh();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
      });
    }
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function login(email: string, password: string, tenantId?: string) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, tenantId }),
  }) as Promise<
    {
      user: { id: string; email: string; name: string };
      tenantId: string;
      role: string;
      accessToken: string;
      refreshToken: string;
    }
  >;
}

export async function refresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('Missing refresh token');
  return apiFetch('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  }) as Promise<{ accessToken: string; refreshToken: string }>;
}

export async function getUsers(search?: string) {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiFetch(`/users${query}`) as Promise<
    Array<{ id: string; email: string; name: string; role: string; status: string; canViewOwnHistory: boolean }>
  >;
}

export async function createUser(payload: {
  email: string;
  name: string;
  password: string;
  role: string;
  canViewOwnHistory?: boolean;
}) {
  return apiFetch('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateUser(userId: string, payload: {
  name?: string;
  status?: 'active' | 'disabled';
  role?: string;
  canViewOwnHistory?: boolean;
}) {
  return apiFetch(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function getTime(userId?: string, from?: string, to?: string) {
  const params = new URLSearchParams();
  if (userId) params.set('userId', userId);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  return apiFetch(`/time${query ? `?${query}` : ''}`) as Promise<
    Array<{ id: string; startedAt: string; endedAt: string | null }>
  >;
}

export async function getActiveSessions() {
  return apiFetch('/time/active') as Promise<
    Array<{
      id: string;
      userId: string;
      userName: string;
      userEmail: string;
      role: string;
      deviceId: string | null;
      deviceName: string | null;
      platform: string | null;
      startedAt: string;
      lastActivityAt: string | null;
      lastApp: string | null;
      lastWindowTitle: string | null;
      lastUrl: string | null;
      idle: boolean | null;
    }>
  >;
}

export async function getActivity(userId?: string, from?: string, to?: string) {
  const params = new URLSearchParams();
  if (userId) params.set('userId', userId);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  return apiFetch(`/activity${query ? `?${query}` : ''}`) as Promise<
    Array<{ id: string; startedAt: string; endedAt: string; appName: string; windowTitle?: string; url?: string; idle: boolean }>
  >;
}

export async function getScreenshots(userId?: string, from?: string, to?: string) {
  const params = new URLSearchParams();
  if (userId) params.set('userId', userId);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  return apiFetch(`/screenshots${query ? `?${query}` : ''}`) as Promise<
    Array<{ id: string; takenAt: string; url: string | null; storageKey: string; expiresAt: string | null }>
  >;
}

export async function getRetention() {
  return apiFetch('/policies/retention') as Promise<{
    timeRetentionDays: number | null;
    activityRetentionDays: number | null;
    screenshotRetentionDays: number | null;
  }>;
}

export async function updateRetention(payload: {
  timeRetentionDays?: number | null;
  activityRetentionDays?: number | null;
  screenshotRetentionDays?: number | null;
}) {
  return apiFetch('/policies/retention', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function getCapturePolicy(userId: string) {
  return apiFetch(`/policies/capture/${userId}`) as Promise<{ intervalSeconds: number }>;
}

export async function setCapturePolicy(userId: string, intervalSeconds: number) {
  return apiFetch(`/policies/capture/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ intervalSeconds }),
  });
}

export async function getAudit(from?: string, to?: string, limit?: number) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (limit) params.set('limit', String(limit));
  const query = params.toString();
  return apiFetch(`/audit${query ? `?${query}` : ''}`) as Promise<
    Array<{ id: string; action: string; entity: string; entityId: string | null; createdAt: string; metadata: any }>
  >;
}

export async function logAudit(payload: {
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, any>;
}) {
  return apiFetch('/audit/log', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
