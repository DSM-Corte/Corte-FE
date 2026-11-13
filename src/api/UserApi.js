import { request } from "./apiClient";

// [{ date: "2026-11-02", count: 2 }] 형태로 1문제 이상 맞힌 날만 날짜 오름차순으로 온다
// count는 그날 맞힌 서로 다른 문제 수다
export async function getMyGrass() {
  return request("/api/users/me/grass");
}
