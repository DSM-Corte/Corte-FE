import {
  getTierRankIndex,
  tierRankOptions,
} from "../components/problems/problemListConfig";
import { mockProblems } from "../data/mockProblem";
import { getAcceptedSuggestionRewardXp } from "./CodeReviewApi";
import { getCurrentUser, getCurrentUserId } from "./AuthApi";
import { ACCEPTED_RESULT } from "./SubmissionApi";
import { getStoredSubmissions } from "./submissionStorage";

export const DEFAULT_LEADERBOARD_PAGE_SIZE = 20;
export const LEADERBOARD_PAGE_SIZE_OPTIONS = [10, 20, 50];
export const LEADERBOARD_SOLVED_RANGE = { min: 0, max: 320, step: 5 };

const problemXpByTier = {
  "Bronze 5": 1,
  "Bronze 4": 2,
  "Bronze 3": 3,
  "Bronze 2": 4,
  "Bronze 1": 5,
  "Silver 5": 7,
  "Silver 4": 8,
  "Silver 3": 10,
  "Silver 2": 12,
  "Silver 1": 14,
  "Gold 5": 18,
  "Gold 4": 22,
  "Gold 3": 26,
  "Gold 2": 31,
  "Gold 1": 36,
  "Platinum 5": 45,
  "Platinum 4": 55,
  "Platinum 3": 67,
  "Platinum 2": 80,
  "Platinum 1": 95,
  "Emerald 5": 115,
  "Emerald 4": 140,
  "Emerald 3": 170,
  "Emerald 2": 205,
  "Emerald 1": 250,
  "Diamond 5": 310,
  "Diamond 4": 380,
  "Diamond 3": 470,
  "Diamond 2": 580,
  "Diamond 1": 720,
  Master: 900,
};

const userTierThresholds = [
  ["Master", 160000],
  ["Diamond 1", 130000],
  ["Diamond 2", 110000],
  ["Diamond 3", 93000],
  ["Diamond 4", 78000],
  ["Diamond 5", 65000],
  ["Emerald 1", 54000],
  ["Emerald 2", 45000],
  ["Emerald 3", 37000],
  ["Emerald 4", 30000],
  ["Emerald 5", 24000],
  ["Platinum 1", 19000],
  ["Platinum 2", 15500],
  ["Platinum 3", 12500],
  ["Platinum 4", 10000],
  ["Platinum 5", 8000],
  ["Gold 1", 6400],
  ["Gold 2", 5100],
  ["Gold 3", 4000],
  ["Gold 4", 3100],
  ["Gold 5", 2400],
  ["Silver 1", 1850],
  ["Silver 2", 1450],
  ["Silver 3", 1100],
  ["Silver 4", 800],
  ["Silver 5", 550],
  ["Bronze 1", 350],
  ["Bronze 2", 220],
  ["Bronze 3", 120],
  ["Bronze 4", 50],
  ["Bronze 5", 0],
];

const seedLeaderboard = [
  {
    userId: "seed-minseo",
    name: "minseo.dev",
    tier: "Diamond 4",
    solvedCount: 286,
    submissionCount: 431,
    xp: 82420,
    streak: 42,
  },
  {
    userId: "seed-jun",
    name: "jun-algo",
    tier: "Diamond 5",
    solvedCount: 244,
    submissionCount: 386,
    xp: 67150,
    streak: 31,
  },
  {
    userId: "seed-hana",
    name: "hana.codes",
    tier: "Emerald 2",
    solvedCount: 198,
    submissionCount: 319,
    xp: 48280,
    streak: 28,
  },
  {
    userId: "seed-yeon",
    name: "yeonstack",
    tier: "Emerald 4",
    solvedCount: 156,
    submissionCount: 261,
    xp: 31870,
    streak: 16,
  },
  {
    userId: "seed-doyun",
    name: "doyun.js",
    tier: "Platinum 2",
    solvedCount: 121,
    submissionCount: 210,
    xp: 16340,
    streak: 19,
  },
  {
    userId: "seed-seo",
    name: "seo.py",
    tier: "Platinum 5",
    solvedCount: 93,
    submissionCount: 144,
    xp: 8420,
    streak: 11,
  },
  {
    userId: "seed-rin",
    name: "rinux",
    tier: "Gold 2",
    solvedCount: 74,
    submissionCount: 128,
    xp: 5280,
    streak: 8,
  },
  {
    userId: "seed-yul",
    name: "yul",
    tier: "Gold 4",
    solvedCount: 58,
    submissionCount: 104,
    xp: 3220,
    streak: 6,
  },
  {
    userId: "seed-nova",
    name: "nova",
    tier: "Silver 1",
    solvedCount: 41,
    submissionCount: 79,
    xp: 1890,
    streak: 5,
  },
  {
    userId: "seed-aru",
    name: "aru",
    tier: "Silver 4",
    solvedCount: 23,
    submissionCount: 51,
    xp: 840,
    streak: 3,
  },
  {
    userId: "seed-moru",
    name: "moru",
    tier: "Bronze 1",
    solvedCount: 14,
    submissionCount: 30,
    xp: 370,
    streak: 2,
  },
];

const sortAccessors = {
  rank: (entry) => entry.rank,
  tier: (entry) => getTierRankIndex(entry.tier),
  solvedCount: (entry) => entry.solvedCount,
  xp: (entry) => entry.xp,
  successRate: (entry) => entry.successRate,
};

function delay(ms = 120) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getTierByXp(xp) {
  const [tier] = userTierThresholds.find(([, threshold]) => xp >= threshold);

  return tier;
}

function getProblemXp(problemId) {
  const problem = mockProblems.find((item) => item.id === Number(problemId));

  return problemXpByTier[problem?.tier] ?? 0;
}

function getCurrentUserLeaderboardEntry(currentUser) {
  const userId = getCurrentUserId();

  if (!userId || !currentUser) {
    return null;
  }

  const userSubmissions = getStoredSubmissions().filter(
    (submission) => submission.userId === userId,
  );
  const acceptedProblemIds = [
    ...new Set(
      userSubmissions
        .filter((submission) => submission.result === ACCEPTED_RESULT)
        .map((submission) => submission.problemId),
    ),
  ];
  const xp = acceptedProblemIds.reduce(
    (sum, problemId) => sum + getProblemXp(problemId),
    0,
  ) + getAcceptedSuggestionRewardXp(userId);
  const solvedCount = acceptedProblemIds.length;
  const submissionCount = userSubmissions.length;

  return {
    userId,
    name: currentUser.name,
    tier: getTierByXp(xp),
    solvedCount,
    submissionCount,
    xp,
    streak: Math.min(14, solvedCount),
    isCurrentUser: true,
  };
}

function enrichEntry(entry) {
  const successRate =
    entry.submissionCount > 0
      ? (entry.solvedCount / entry.submissionCount) * 100
      : 0;

  return {
    ...entry,
    successRate,
  };
}

function getEntriesWithRanks(entries) {
  return [...entries]
    .sort((left, right) => {
      if (right.xp !== left.xp) {
        return right.xp - left.xp;
      }

      return right.solvedCount - left.solvedCount;
    })
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
}

function matchesRange(value, min, max) {
  const parsedMin = Number(min);
  const parsedMax = Number(max);
  const hasMin = min !== "" && Number.isFinite(parsedMin);
  const hasMax = max !== "" && Number.isFinite(parsedMax);

  if (hasMin && value < parsedMin) {
    return false;
  }

  if (hasMax && value > parsedMax) {
    return false;
  }

  return true;
}

function sortEntries(entries, sortKey, sortDirection) {
  const accessor = sortAccessors[sortKey] ?? sortAccessors.rank;
  const direction = sortDirection === "asc" ? 1 : -1;

  return [...entries].sort((left, right) => {
    const leftValue = accessor(left);
    const rightValue = accessor(right);

    return (Number(leftValue) - Number(rightValue)) * direction;
  });
}

function paginate(entries, page, pageSize) {
  const normalizedPageSize = LEADERBOARD_PAGE_SIZE_OPTIONS.includes(Number(pageSize))
    ? Number(pageSize)
    : DEFAULT_LEADERBOARD_PAGE_SIZE;
  const totalCount = entries.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / normalizedPageSize));
  const currentPage = Math.min(Math.max(Number(page) || 1, 1), totalPages);
  const startIndex = (currentPage - 1) * normalizedPageSize;
  const endIndex = Math.min(startIndex + normalizedPageSize, totalCount);

  return {
    items: entries.slice(startIndex, endIndex),
    totalCount,
    currentPage,
    pageSize: normalizedPageSize,
    totalPages,
    startIndex: totalCount === 0 ? 0 : startIndex + 1,
    endIndex,
    hasPreviousPage: currentPage > 1,
    hasNextPage: currentPage < totalPages,
  };
}

export function createDefaultLeaderboardFilters() {
  return {
    keyword: "",
    tierMinIndex: "0",
    tierMaxIndex: String(tierRankOptions.length - 1),
    solvedMin: String(LEADERBOARD_SOLVED_RANGE.min),
    solvedMax: String(LEADERBOARD_SOLVED_RANGE.max),
  };
}

export async function getLeaderboard(options = {}) {
  await delay();

  const currentUser = await getCurrentUser();
  const currentUserEntry = getCurrentUserLeaderboardEntry(currentUser);
  const entries = currentUserEntry
    ? [
        currentUserEntry,
        ...seedLeaderboard.filter((entry) => entry.userId !== currentUserEntry.userId),
      ]
    : seedLeaderboard;
  const rankedEntries = getEntriesWithRanks(entries.map(enrichEntry));
  const {
    keyword = "",
    tierMinIndex = "0",
    tierMaxIndex = String(tierRankOptions.length - 1),
    solvedMin = "",
    solvedMax = "",
    sortKey = "rank",
    sortDirection = "asc",
    page = 1,
    pageSize = DEFAULT_LEADERBOARD_PAGE_SIZE,
  } = options;
  const normalizedKeyword = normalize(keyword);

  const filteredEntries = rankedEntries.filter((entry) => {
    const tierIndex = getTierRankIndex(entry.tier);
    const matchesKeyword =
      !normalizedKeyword ||
      normalize(entry.name).includes(normalizedKeyword) ||
      normalize(entry.tier).includes(normalizedKeyword);

    return (
      matchesKeyword &&
      tierIndex >= Number(tierMinIndex) &&
      tierIndex <= Number(tierMaxIndex) &&
      matchesRange(entry.solvedCount, solvedMin, solvedMax)
    );
  });

  return paginate(
    sortEntries(filteredEntries, sortKey, sortDirection),
    page,
    pageSize,
  );
}
