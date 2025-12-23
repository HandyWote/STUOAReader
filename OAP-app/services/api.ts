const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

export function getApiBaseUrl() {
  return apiBaseUrl;
}

export function buildAuthHeaders(token?: string | null) {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}
