import { ApiError, request } from "./apiClient";

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

export function getMyTier() {
  return request("/api/users/me/tier");
}

export function getMyStats() {
  return request("/api/users/me/stats");
}

// 다른 사용자도 볼 수 있는 공개 프로필. { userId, nickname, stats } 형태이고 stats는 getMyStats와 같은 모양이다
// 없는 회원이면 404(U003)
export async function getUserProfile(userId) {
  const path = `/api/users/${encodeURIComponent(userId)}/profile`;

  try {
    return await request(path);
  } catch (error) {
    // 공개 화면인데 만료된 토큰 때문에 401이 나면, apiClient가 세션을 지웠으니 토큰 없이 한 번 더 부른다
    if (error instanceof ApiError && error.status === 401) {
      return request(path);
    }

    throw error;
  }
}
