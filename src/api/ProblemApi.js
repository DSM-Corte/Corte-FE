import { mockProblems } from "../data/mockProblem.js";
import { getRecommendedProblemSet } from "../data/problemSetDefinitions.js";
import { getTierRankIndex } from "../components/problems/problemListConfig.js";
import { getCurrentUserId } from "./AuthApi.js";
import { getCustomProblemSets } from "./ProblemSetApi.js";
import { getUserSubmissions } from "./submissionStorage.js";

const sortAccessors = {
  id: (problem) => problem.id,
  tier: (problem) => getTierRankIndex(problem.tier),
  title: (problem) => problem.title,
  solvedCount: (problem) => problem.solvedCount,
  averageTries: (problem) => problem.averageTries,
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

  const customProblemSets = await getCustomProblemSets();
  const customProblemSet = customProblemSets.find(
    (problemSet) => problemSet.id === problemSetId,
  );

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

function getUserProblemStats() {
  const userId = getCurrentUserId();
  const submissions = getUserSubmissions(userId);
  const attemptedProblemIds = new Set();
  const solvedProblemIds = new Set();

  submissions.forEach((submission) => {
    attemptedProblemIds.add(submission.problemId);

    if (submission.result === "맞았습니다") {
      solvedProblemIds.add(submission.problemId);
    }
  });

  return {
    attemptedProblemIds,
    solvedProblemIds,
  };
}

function applyUserProblemStatus(problem, userProblemStats) {
  return {
    ...problem,
    attempted: userProblemStats.attemptedProblemIds.has(problem.id),
    solved: userProblemStats.solvedProblemIds.has(problem.id),
  };
}

function getUserProblems() {
  const userProblemStats = getUserProblemStats();
  return mockProblems.map((problem) =>
    applyUserProblemStatus(problem, userProblemStats),
  );
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

export async function getProblemList(options = {}) {
  const {
    keyword = "",
    tierMinIndex = "0",
    tierMaxIndex = "29",
    selectedTags = [],
    tagMode = "OR",
    status = "all",
    solvedMin = "",
    solvedMax = "",
    averageMin = "",
    averageMax = "",
    problemSetId = "",
    sortKey = "id",
    sortDirection = "asc",
    page = 1,
    pageSize = DEFAULT_PROBLEM_PAGE_SIZE,
  } = options;

  const userProblems = getUserProblems();
  const problemSetFilter = await getProblemSetFilter(problemSetId, userProblems);

  const filteredProblems = userProblems.filter((problem) => {
    const tierIndex = getTierRankIndex(problem.tier);
    const tierAllowed =
      tierIndex >= Number(tierMinIndex) && tierIndex <= Number(tierMaxIndex);

    return (
      tierAllowed &&
      (!problemSetFilter || problemSetFilter.has(Number(problem.id))) &&
      matchesKeyword(problem, keyword) &&
      matchesTags(problem, selectedTags, tagMode) &&
      matchesStatus(problem, status) &&
      matchesRange(problem.solvedCount, solvedMin, solvedMax) &&
      matchesRange(problem.averageTries, averageMin, averageMax)
    );
  });

  const sortedProblems = sortProblems(filteredProblems, sortKey, sortDirection);

  return paginateProblems(sortedProblems, page, pageSize);
}

export async function getProblemById(id) {
  const problem = mockProblems.find((item) => item.id === Number(id));

  if (!problem) {
    return undefined;
  }

  const userProblem = applyUserProblemStatus(problem, getUserProblemStats());

  return {
    ...userProblem,
    detail: createProblemDetail(userProblem),
  };
}

export async function getProblemCatalog() {
  return getUserProblems();
}

export async function getProblemTags() {
  const tags = mockProblems.flatMap((problem) => problem.tags);
  return [...new Set(tags)].sort((a, b) => a.localeCompare(b));
}

export async function getProblemOptions() {
  return mockProblems
    .map((problem) => ({
      id: problem.id,
      title: problem.title,
      tier: problem.tier,
    }))
    .sort((left, right) => left.id - right.id);
}

function createProblemDetail(problem) {
  const tagText = problem.tags.join(", ");

  return {
    summary: `${problem.title} 문제는 ${tagText} 역량을 확인하기 위한 ${problem.tier} 난이도의 알고리즘 문제입니다.`,
    description: [
      `주어진 입력을 분석하여 ${problem.title}에 맞는 결과를 출력하세요.`,
      "문제의 조건을 만족하는 풀이를 작성해야 하며, 동일한 입력에 대해서는 항상 같은 정답을 반환해야 합니다.",
      "입력 크기와 경계값을 고려하여 평균 시도 횟수를 낮출 수 있는 풀이를 설계해 보세요.",
    ],
    constraints: [
      "모든 입력은 문제에서 정의한 형식을 따릅니다.",
      "출력은 정답 형식과 정확히 일치해야 합니다.",
      "제한 시간 안에 모든 테스트 케이스를 통과해야 합니다.",
    ],
    examples: [
      {
        title: "예제 1",
        input: problem.id === 1000 || problem.id === 1001 ? "3 5" : "sample input 1",
        output:
          problem.id === 1000 ? "8" : problem.id === 1001 ? "-2" : "sample output 1",
        explanation:
          problem.id === 1000
            ? "3과 5를 더한 값인 8을 출력합니다."
            : problem.id === 1001
              ? "3에서 5를 뺀 값인 -2를 출력합니다."
            : `${problem.title}의 기본 조건을 만족하는 예시입니다.`,
      },
      {
        title: "예제 2",
        input: problem.id === 1000 ? "1 2" : problem.id === 1001 ? "9 4" : "sample input 2",
        output: problem.id === 1000 ? "3" : problem.id === 1001 ? "5" : "sample output 2",
        explanation:
          problem.id === 1000
            ? "1과 2를 더한 값인 3을 출력합니다."
            : problem.id === 1001
            ? "9에서 4를 뺀 값인 5를 출력합니다."
            : "다른 입력에서도 같은 규칙을 적용합니다.",
      },
    ],
  };
}
