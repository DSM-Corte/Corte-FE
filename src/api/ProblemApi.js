import { getRecommendedProblemSet } from "../data/problemSetDefinitions.js";
import { getTierRankIndex, tierRankOptions } from "../components/problems/problemListConfig.js";
import { request } from "./apiClient.js";
import { getCustomProblemSet, getWorkbookCatalogWithProgress, toWorkbookProblem } from "./ProblemSetApi.js";

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
    return !problem.solved;
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

// 난이도·해결 상태는 서버에서 거르고, 추가 검색·정렬은 받은 목록에 적용한다.
// serverCatalog는 문제별 풀이 진행 상태를 합칠 때 사용한다.
export async function getProblemList(options = {}) {
  const {
    serverCatalog,
    keyword = "",
    difficultyTier = "",
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

  let problems = serverCatalog ?? await getWorkbookCatalogWithProgress();

  const query = new URLSearchParams({ size: String(pageSize), page: String(page - 1) });
  if (difficultyTier) query.set("difficultyTier", difficultyTier);
  query.set("solveStatus", { solved: "SOLVED", unsolved: "UNSOLVED" }[status] ?? "ALL");
  const simplePage = !keyword.trim() && selectedTags.length === 0 && !problemSetId
    && sortKey === "id" && sortDirection === "desc";
  const progress = new Map(problems.map((problem) => [Number(problem.id), problem]));
  const withProgress = (problem) => ({ ...toWorkbookProblem(problem),
    solved: status === "solved" || (status !== "unsolved" && Boolean(progress.get(Number(problem.id))?.solved)),
    attempted: Boolean(progress.get(Number(problem.id))?.attempted),
  });
  if (simplePage) {
    let result = await request(`/api/problems?${query}`);
    if (result.totalPages > 0 && result.page >= result.totalPages) {
      query.set("page", String(result.totalPages - 1));
      result = await request(`/api/problems?${query}`);
    }
    const currentPage = result.page + 1;
    return {
      items: result.content.map(withProgress), totalCount: result.totalElements,
      currentPage, pageSize: result.size, totalPages: Math.max(1, result.totalPages),
      startIndex: result.totalElements ? result.page * result.size + 1 : 0,
      endIndex: Math.min(currentPage * result.size, result.totalElements),
      hasPreviousPage: result.page > 0, hasNextPage: currentPage < result.totalPages,
    };
  }
  // 기존 복수 태그·키워드·정렬은 서버에서 필터링한 목록에 적용한다.
  problems = [];
  query.set("size", "100");
  let index = 0;
  let result;
  do {
    query.set("page", String(index++));
    result = await request(`/api/problems?${query}`);
    problems.push(...result.content.map(withProgress));
  } while (index < result.totalPages);
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
