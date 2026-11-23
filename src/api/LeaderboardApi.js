import { ApiError, request } from "./apiClient";

export const DEFAULT_LEADERBOARD_PAGE_SIZE = 20;
export const LEADERBOARD_PAGE_SIZE_OPTIONS = [10, 20, 50];
export const LEADERBOARD_SOLVED_RANGE = { min: 0, max: 320, step: 5 };

// 회원 티어는 Bronze 3 ~ Diamond 1 15단계다(백엔드 GET /api/users/me/tier와 같은 기준)
const memberTierGroups = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];
export const LEADERBOARD_TIER_OPTIONS = memberTierGroups.flatMap((group) =>
  ["3", "2", "1"].map((grade) => `${group} ${grade}`),
);

// 화면 정렬 키 → 서버 sort 값. 티어는 점수로 정해지므로 점수로 정렬한다
const serverSortKeys = {
  rank: "RANK",
  tier: "SCORE",
  solvedCount: "SOLVED",
  score: "SCORE",
  successRate: "ACCURACY",
  streak: "STREAK",
};

export function createDefaultLeaderboardFilters() {
  return {
    keyword: "",
    tierMinIndex: "0",
    tierMaxIndex: String(LEADERBOARD_TIER_OPTIONS.length - 1),
    solvedMin: String(LEADERBOARD_SOLVED_RANGE.min),
    solvedMax: String(LEADERBOARD_SOLVED_RANGE.max),
  };
}

// "Gold 3" → "GOLD_3"
function toServerTier(tier) {
  return tier.toUpperCase().replace(" ", "_");
}

// "GOLD_3" → "Gold 3"
function toScreenTier(serverTier) {
  const [group, grade] = String(serverTier).split("_");
  const name = group.charAt(0) + group.slice(1).toLowerCase();

  return grade ? `${name} ${grade}` : name;
}

function buildQuery(options) {
  const params = new URLSearchParams();
  const lastTierIndex = LEADERBOARD_TIER_OPTIONS.length - 1;
  const keyword = String(options.keyword ?? "").trim();
  const minIndex = Number(options.tierMinIndex);
  const maxIndex = Number(options.tierMaxIndex);
  const minSolved = Number(options.solvedMin);
  const maxSolved = Number(options.solvedMax);

  params.set("page", String(options.page - 1));
  params.set("size", String(options.pageSize));
  params.set("sort", serverSortKeys[options.sortKey] ?? "RANK");
  params.set("direction", options.sortDirection === "asc" ? "ASC" : "DESC");

  if (keyword) {
    params.set("keyword", keyword);
  }

  // 슬라이더 양 끝은 "제한 없음"이라 조건을 보내지 않는다
  if (minIndex > 0) {
    params.set("minTier", toServerTier(LEADERBOARD_TIER_OPTIONS[minIndex]));
  }

  if (maxIndex < lastTierIndex) {
    params.set("maxTier", toServerTier(LEADERBOARD_TIER_OPTIONS[maxIndex]));
  }

  if (minSolved > LEADERBOARD_SOLVED_RANGE.min) {
    params.set("minSolved", String(minSolved));
  }

  if (maxSolved < LEADERBOARD_SOLVED_RANGE.max) {
    params.set("maxSolved", String(maxSolved));
  }

  return params.toString();
}

function toEntry(entry) {
  return {
    rank: entry.rank,
    userId: entry.userId,
    name: entry.nickname,
    tier: toScreenTier(entry.tier),
    solvedCount: entry.solvedCount,
    submissionCount: entry.submissionCount,
    score: entry.score,
    successRate: entry.accuracy,
    streak: entry.streak,
    isCurrentUser: entry.me,
  };
}

function toPagination(response) {
  const currentPage = response.page + 1;
  const totalPages = Math.max(1, response.totalPages);
  const startIndex = response.page * response.size;

  return {
    items: response.content.map(toEntry),
    totalCount: response.totalElements,
    currentPage,
    pageSize: response.size,
    totalPages,
    startIndex: response.content.length === 0 ? 0 : startIndex + 1,
    endIndex: startIndex + response.content.length,
    hasPreviousPage: currentPage > 1,
    hasNextPage: currentPage < totalPages,
  };
}

// options: 화면 필터({ keyword, tierMinIndex, ... }) + sortKey, sortDirection, page(1부터), pageSize
export async function getLeaderboard(options) {
  const path = `/api/leaderboard?${buildQuery(options)}`;

  try {
    return toPagination(await request(path));
  } catch (error) {
    // 공개 화면인데 만료된 토큰 때문에 401이 나면, apiClient가 세션을 지웠으니 토큰 없이 한 번 더 부른다
    if (error instanceof ApiError && error.status === 401) {
      return toPagination(await request(path));
    }

    throw error;
  }
}
