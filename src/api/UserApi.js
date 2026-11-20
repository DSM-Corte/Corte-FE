import { request } from "./apiClient";

// [{ date: "2026-11-02", count: 2 }] 형태로 1문제 이상 맞힌 날만 날짜 오름차순으로 온다
// count는 그날 맞힌 서로 다른 문제 수다
export async function getMyGrass() {
  return request("/api/users/me/grass");
}

// { mode: "DARK", color: "PINK" } 형태로 온다. 한 번도 안 골랐으면 LIGHT와 BLUE다
export async function getMyTheme() {
  return request("/api/users/me/theme");
}

// 바꿀 값만 보낸다. 예: { mode: "DARK" } 또는 { color: "PINK" }
export async function updateMyTheme(change) {
  return request("/api/users/me/theme", { method: "PATCH", body: change });
}

export function getMyStats() {
  return request("/api/users/me/stats");
}
