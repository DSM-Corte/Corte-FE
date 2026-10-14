export const SOLVED_RANGE = { min: 0, max: 1000000, step: 1000 };
export const AVERAGE_RANGE = { min: 1, max: 8, step: 0.1 };

export const tierGroups = [
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Emerald",
  "Diamond",
];

export const tierGrades = ["5", "4", "3", "2", "1"];

export const MASTER_TIER = "Master";

export const tierRankOptions = [
  ...tierGroups.flatMap((group) =>
    tierGrades.map((grade) => `${group} ${grade}`),
  ),
  MASTER_TIER,
];

export function createDefaultFilters() {
  return {
    keyword: "",
    tierMinIndex: "0",
    tierMaxIndex: String(tierRankOptions.length - 1),
    selectedTags: [],
    tagMode: "OR",
    status: "all",
    solvedMin: String(SOLVED_RANGE.min),
    solvedMax: String(SOLVED_RANGE.max),
    averageMin: String(AVERAGE_RANGE.min),
    averageMax: String(AVERAGE_RANGE.max),
    problemSetId: "",
  };
}

export const sortOptions = [
  { key: "id", label: "ID" },
  { key: "tier", label: "티어" },
  { key: "solvedCount", label: "푼 사람 수" },
  { key: "averageTries", label: "평균 시도" },
  { key: "random", label: "랜덤" },
];

export const problemSortKeys = sortOptions.map((option) => option.key);

export const statusOptions = [
  { key: "all", label: "전체" },
  { key: "solved", label: "해결" },
  { key: "attempted", label: "시도했으나 미해결" },
  { key: "unsolved", label: "미해결" },
];

export function getTierRankIndex(tier) {
  const index = tierRankOptions.indexOf(tier);
  return index === -1 ? 0 : index;
}
