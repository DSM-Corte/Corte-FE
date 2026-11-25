import { getRecommendedProblemSet } from "../data/problemSetDefinitions.js";
import { getTierRankIndex, tierRankOptions } from "../components/problems/problemListConfig.js";
import { getCustomProblemSet, getWorkbookCatalogWithProgress } from "./ProblemSetApi.js";

const sortAccessors = {
  id: (problem) => problem.id,
  tier: (problem) => getTierRankIndex(problem.tier),
  title: (problem) => problem.title,
};

export const DEFAULT_PROBLEM_PAGE_SIZE = 20;
export const PROBLEM_PAGE_SIZE_OPTIONS = [5, 10, 20];

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function matchesKeyword(problem, keyword) {
  const normalizedKeyword = normalize(keyword);

  if (!normalizedKeyword) {
    return true;
  }

  return (
    normalize(problem.title).includes(normalizedKeyword) ||
    String(problem.id).includes(normalizedKeyword) ||
    normalize(problem.tier).includes(normalizedKeyword) ||
    problem.tags.some((tag) => normalize(tag).includes(normalizedKeyword))
  );
}

function matchesTags(problem, selectedTags, tagMode) {
  const tags = selectedTags.map((tag) => normalize(tag)).filter(Boolean);

  if (tags.length === 0) {
    return true;
  }

  const matcher = (query) =>
    problem.tags.some((tag) => normalize(tag).includes(query));

  return tagMode === "AND" ? tags.every(matcher) : tags.some(matcher);
}

function matchesStatus(problem, status) {
  if (status === "solved") {
    return problem.solved;
  }

  if (status === "attempted") {
    return problem.attempted && !problem.solved;
  }

  if (status === "unsolved") {
    return !problem.attempted && !problem.solved;
  }

  return true;
}

async function getProblemSetFilter(problemSetId, problems) {
  if (!problemSetId) {
    return null;
  }

  const recommendedProblemSet = getRecommendedProblemSet(problemSetId);

  if (recommendedProblemSet) {
    return new Set(
      problems
        .filter(recommendedProblemSet.filter)
        .map((problem) => Number(problem.id)),
    );
  }

  const customProblemSet = await getCustomProblemSet(problemSetId);

  if (!customProblemSet) {
    return new Set();
  }

  return new Set(customProblemSet.problemIds.map(Number));
}

function sortProblems(problems, sortKey, sortDirection) {
  if (sortKey === "random") {
    return [...problems].sort(() => Math.random() - 0.5);
  }

  const accessor = sortAccessors[sortKey] ?? sortAccessors.id;
  const direction = sortDirection === "desc" ? -1 : 1;

  return [...problems].sort((a, b) => {
    const left = accessor(a);
    const right = accessor(b);

    if (typeof left === "string" && typeof right === "string") {
      return left.localeCompare(right, "ko") * direction;
    }

    return (Number(left) - Number(right)) * direction;
  });
}

function paginateProblems(problems, page, pageSize) {
  const normalizedPageSize = PROBLEM_PAGE_SIZE_OPTIONS.includes(Number(pageSize))
    ? Number(pageSize)
    : DEFAULT_PROBLEM_PAGE_SIZE;
  const totalCount = problems.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / normalizedPageSize));
  const currentPage = Math.min(Math.max(Number(page) || 1, 1), totalPages);
  const startIndex = (currentPage - 1) * normalizedPageSize;
  const endIndex = Math.min(startIndex + normalizedPageSize, totalCount);

  return {
    items: problems.slice(startIndex, endIndex),
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

// 서버 문제 목록(로그인했으면 내 제출 기록으로 푼 문제 표시까지)을 받아 화면에서 거르고 정렬해 한 페이지를 준다
// serverCatalog를 넘기면 다시 받지 않고 그 목록을 쓴다
export async function getProblemList(options = {}) {
  const {
    serverCatalog,
    keyword = "",
    tierMinIndex = "0",
    tierMaxIndex = String(tierRankOptions.length - 1),
    selectedTags = [],
    tagMode = "OR",
    status = "all",
    problemSetId = "",
    sortKey = "id",
    sortDirection = "asc",
    page = 1,
    pageSize = DEFAULT_PROBLEM_PAGE_SIZE,
  } = options;

  const problems = serverCatalog ?? await getWorkbookCatalogWithProgress();
  const problemSetFilter = await getProblemSetFilter(problemSetId, problems);

  const filteredProblems = problems.filter((problem) => {
    const tierIndex = getTierRankIndex(problem.tier);
    const tierAllowed =
      tierIndex >= Number(tierMinIndex) && tierIndex <= Number(tierMaxIndex);

    return (
      tierAllowed &&
      (!problemSetFilter || problemSetFilter.has(Number(problem.id))) &&
      matchesKeyword(problem, keyword) &&
      matchesTags(problem, selectedTags, tagMode) &&
      matchesStatus(problem, status)
    );
  });

  const sortedProblems = sortProblems(filteredProblems, sortKey, sortDirection);

  return paginateProblems(sortedProblems, page, pageSize);
}
