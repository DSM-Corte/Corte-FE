import { getCurrentUserId } from "./AuthApi";

const PROBLEM_SET_STORAGE_KEY = "cotre_mock_problem_sets";

function delay(ms = 120) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function getStoredProblemSets() {
  const rawProblemSets = window.localStorage.getItem(PROBLEM_SET_STORAGE_KEY);

  if (!rawProblemSets) {
    return [];
  }

  try {
    return JSON.parse(rawProblemSets);
  } catch {
    window.localStorage.removeItem(PROBLEM_SET_STORAGE_KEY);
    return [];
  }
}

function saveProblemSets(problemSets) {
  window.localStorage.setItem(PROBLEM_SET_STORAGE_KEY, JSON.stringify(problemSets));
}

function createProblemSetError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export async function getCustomProblemSets() {
  await delay();

  const userId = getCurrentUserId();

  return getStoredProblemSets()
    .filter((problemSet) => !problemSet.ownerId || problemSet.ownerId === userId)
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

export async function createCustomProblemSet({ title, description, problemIds }) {
  await delay();

  const ownerId = getCurrentUserId();
  const trimmedTitle = String(title ?? "").trim();
  const trimmedDescription = String(description ?? "").trim();
  const uniqueProblemIds = [...new Set(problemIds.map(Number))]
    .filter((problemId) => Number.isFinite(problemId))
    .sort((left, right) => left - right);

  if (!ownerId) {
    throw createProblemSetError("로그인 후 문제집을 만들 수 있습니다.", "AUTH_REQUIRED");
  }

  if (!trimmedTitle) {
    throw createProblemSetError("문제집 제목을 입력해주세요.", "EMPTY_TITLE");
  }

  if (uniqueProblemIds.length === 0) {
    throw createProblemSetError("문제를 1개 이상 선택해주세요.", "EMPTY_PROBLEMS");
  }

  const problemSet = {
    id: `custom-set-${Date.now()}`,
    ownerId,
    title: trimmedTitle,
    description:
      trimmedDescription || "직접 고른 문제를 순서대로 풀어보는 사용자 문제집입니다.",
    problemIds: uniqueProblemIds,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveProblemSets([problemSet, ...getStoredProblemSets()]);

  return problemSet;
}
