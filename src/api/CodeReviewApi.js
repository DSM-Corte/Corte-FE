import { getCurrentUser, getCurrentUserId } from "./AuthApi";
import { generateGeminiCodeReview } from "./GeminiApi";
import { getProblemOptions } from "./ProblemApi";
import { ACCEPTED_RESULT, getSubmissionList } from "./SubmissionApi";

const CODE_REVIEW_STORAGE_KEY = "cotre_mock_code_reviews";
export const CODE_REVIEW_UPDATED_EVENT = "cotre-code-reviews-updated";

const generationRequests = new Map();

function delay(ms = 120) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function normalizeSuggestion(suggestion) {
  const recommendedBy = Array.isArray(suggestion.recommendedBy)
    ? suggestion.recommendedBy
    : [];

  return {
    ...suggestion,
    recommendedBy,
    recommendationCount:
      Number(suggestion.recommendationCount) || recommendedBy.length,
  };
}

function normalizeReview(review) {
  return {
    ...review,
    generationStatus: review.generationStatus ?? "ready",
    isClosed: Boolean(review.isClosed),
    closedAt: review.closedAt ?? "",
    aiSummary: review.aiSummary ?? "리뷰 요약을 준비했습니다.",
    acceptedSuggestionId: review.acceptedSuggestionId ?? "",
    comments: review.comments ?? [],
    suggestions: (review.suggestions ?? []).map(normalizeSuggestion),
  };
}

function getStoredReviews() {
  const rawReviews = window.localStorage.getItem(CODE_REVIEW_STORAGE_KEY);

  if (!rawReviews) {
    return [];
  }

  try {
    return JSON.parse(rawReviews).map(normalizeReview);
  } catch {
    window.localStorage.removeItem(CODE_REVIEW_STORAGE_KEY);
    return [];
  }
}

function saveReviews(reviews) {
  window.localStorage.setItem(CODE_REVIEW_STORAGE_KEY, JSON.stringify(reviews));
  window.dispatchEvent(new Event(CODE_REVIEW_UPDATED_EVENT));
}

function createCodeReviewError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function assertCanReviewProblem(problemId) {
  const acceptedProblemIds = await getAcceptedProblemIds();

  if (!acceptedProblemIds.has(Number(problemId))) {
    throw createCodeReviewError(
      "해당 문제를 해결한 사용자만 코드 리뷰를 볼 수 있습니다.",
      "REVIEW_FORBIDDEN",
    );
  }
}

function assertReviewOpen(review) {
  if (review.isClosed) {
    throw createCodeReviewError(
      "닫힌 리뷰에는 새 변경을 추가할 수 없습니다.",
      "REVIEW_CLOSED",
    );
  }
}

function assertCanManageReview(review, user) {
  if (!user) {
    throw createCodeReviewError("로그인 후 변경할 수 있습니다.", "AUTH_REQUIRED");
  }

  if (review.authorId && review.authorId !== user.id) {
    throw createCodeReviewError(
      "리뷰 작성자만 상태를 변경할 수 있습니다.",
      "REVIEW_STATUS_FORBIDDEN",
    );
  }
}

function getCodeLines(code) {
  return String(code ?? "").split("\n");
}

function getFirstMeaningfulLine(lines) {
  const index = lines.findIndex((line) => line.trim());
  return index === -1 ? 1 : index + 1;
}

function getOutputLine(lines) {
  const index = lines.findIndex((line) =>
    /console\.log|print\(|return\s+/i.test(line),
  );
  return index === -1 ? Math.max(1, lines.length) : index + 1;
}

function createSuggestedCode({ code, language }) {
  if (language === "python") {
    return `# COTRE review suggestion: keep parsing and output logic easy to verify.\n${code}`;
  }

  return `// COTRE review suggestion: keep parsing and output logic easy to verify.\n${code}`;
}

function createAiReview({ submission, description }) {
  const lines = getCodeLines(submission.code);
  const firstLine = getFirstMeaningfulLine(lines);
  const outputLine = getOutputLine(lines);
  const hasDescription = String(description ?? "").trim().length > 0;

  return {
    source: "mock",
    summary: hasDescription
      ? "설명 기준으로 보면 풀이 의도는 잘 드러납니다. 이제 입력 처리와 출력 형식이 흔들리지 않도록 경계값을 조금 더 명확히 남기면 좋습니다."
      : "코드 구조는 간단하지만, 리뷰를 더 정확히 하려면 풀이 의도와 시간 복잡도 설명을 함께 남기는 것이 좋습니다.",
    comments: [
      {
        id: `ai-comment-${Date.now()}-1`,
        authorType: "ai",
        authorName: "COTRE Review",
        line: firstLine,
        body: "풀이의 시작 지점입니다. 입력을 어떤 형태로 해석하는지 짧게 주석이나 설명에 남기면 이후 리뷰가 쉬워집니다.",
        createdAt: new Date().toISOString(),
      },
      {
        id: `ai-comment-${Date.now()}-2`,
        authorType: "ai",
        authorName: "COTRE Review",
        line: outputLine,
        body: "정답 출력 부분은 문제의 공백과 줄바꿈 조건에 직접 영향을 받습니다. 예제 외 입력에서도 같은 형식을 유지하는지 확인해보세요.",
        createdAt: new Date().toISOString(),
      },
    ],
    suggestions: [
      {
        id: `ai-suggestion-${Date.now()}`,
        authorType: "ai",
        authorId: "ai-cotre",
        authorName: "COTRE Review",
        title: "검증하기 쉬운 형태로 의도 주석 추가",
        description:
          "동작을 바꾸기보다는 리뷰 과정에서 입력/출력 흐름이 잘 보이도록 짧은 의도 주석을 추가한 제안입니다.",
        code: createSuggestedCode(submission),
        recommendedBy: [],
        recommendationCount: 0,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

async function createAiReviewWithFallback({ submission, description }) {
  try {
    return {
      ...(await generateGeminiCodeReview({ submission, description })),
      fallbackReason: "",
    };
  } catch (error) {
    return {
      ...createAiReview({ submission, description }),
      fallbackReason: error.message,
    };
  }
}

function getSubmissionFromReview(review) {
  return {
    id: review.submissionId,
    problemId: review.problemId,
    problemTitle: review.problemTitle,
    language: review.language,
    code: review.code,
    runtimeMs: review.runtimeMs,
    memoryKb: review.memoryKb,
  };
}

async function completeGeneratedReview(reviewId, { submission, description }) {
  const aiReview = await createAiReviewWithFallback({ submission, description });
  const reviews = getStoredReviews();
  const review = reviews.find((item) => item.id === reviewId);

  if (!review || review.generationStatus !== "generating") {
    return review;
  }

  const nextReview = {
    ...review,
    aiProvider: aiReview.source,
    aiFallbackReason: aiReview.fallbackReason,
    aiSummary: aiReview.summary,
    comments: [...(review.comments ?? []), ...aiReview.comments],
    suggestions: [...(review.suggestions ?? []), ...aiReview.suggestions],
    generationStatus: "ready",
    updatedAt: new Date().toISOString(),
  };

  saveReviews(reviews.map((item) => (item.id === reviewId ? nextReview : item)));

  return nextReview;
}

export function ensureCodeReviewGenerated(reviewId) {
  const review = getStoredReviews().find((item) => item.id === reviewId);

  if (!review || review.generationStatus !== "generating") {
    return Promise.resolve(review);
  }

  if (generationRequests.has(reviewId)) {
    return generationRequests.get(reviewId);
  }

  const request = completeGeneratedReview(reviewId, {
    submission: getSubmissionFromReview(review),
    description: review.description,
  }).finally(() => {
    generationRequests.delete(reviewId);
  });

  generationRequests.set(reviewId, request);

  return request;
}

async function getAcceptedSubmission(submissionId) {
  const submissions = await getSubmissionList();
  const submission = submissions.find((item) => item.id === submissionId);

  if (!submission) {
    throw createCodeReviewError("제출 기록을 찾을 수 없습니다.", "SUBMISSION_NOT_FOUND");
  }

  if (submission.result !== ACCEPTED_RESULT) {
    throw createCodeReviewError(
      "코드 리뷰는 정답 처리된 제출만 요청할 수 있습니다.",
      "SUBMISSION_NOT_ACCEPTED",
    );
  }

  return submission;
}

async function getAcceptedProblemIds() {
  const submissions = await getSubmissionList();

  return new Set(
    submissions
      .filter((submission) => submission.result === ACCEPTED_RESULT)
      .map((submission) => Number(submission.problemId)),
  );
}

export async function createCodeReview({ submissionId, title, description }) {
  await delay();

  const trimmedTitle = String(title ?? "").trim();
  const trimmedDescription = String(description ?? "").trim();

  if (!trimmedTitle) {
    throw createCodeReviewError("리뷰 제목을 입력해주세요.", "EMPTY_TITLE");
  }

  if (!trimmedDescription) {
    throw createCodeReviewError("코드 설명을 입력해주세요.", "EMPTY_DESCRIPTION");
  }

  const [submission, user] = await Promise.all([
    getAcceptedSubmission(submissionId),
    getCurrentUser(),
  ]);
  const review = {
    id: `code-review-${Date.now()}`,
    submissionId: submission.id,
    problemId: submission.problemId,
    problemTitle: submission.problemTitle,
    title: trimmedTitle,
    description: trimmedDescription,
    language: submission.language,
    code: submission.code,
    runtimeMs: submission.runtimeMs,
    memoryKb: submission.memoryKb,
    authorId: user?.id ?? "",
    authorName: user?.name ?? "익명",
    aiProvider: "",
    aiFallbackReason: "",
    aiSummary: "리뷰 요약과 제안 코드를 준비하는 중입니다.",
    comments: [],
    suggestions: [],
    generationStatus: "generating",
    isClosed: false,
    closedAt: "",
    acceptedSuggestionId: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveReviews([review, ...getStoredReviews()]);
  ensureCodeReviewGenerated(review.id);

  return review;
}

export async function getCodeReviewList({ problemId } = {}) {
  await delay();

  const acceptedProblemIds = await getAcceptedProblemIds();
  const filteredReviews = getStoredReviews().filter((review) => {
    const canReviewProblem = acceptedProblemIds.has(Number(review.problemId));
    const matchesProblem =
      !problemId || Number(review.problemId) === Number(problemId);

    return canReviewProblem && matchesProblem;
  });

  return filteredReviews;
}

export async function getCodeReviewById(id) {
  await delay();

  const review = getStoredReviews().find((item) => item.id === id);

  if (!review) {
    return undefined;
  }

  const acceptedProblemIds = await getAcceptedProblemIds();

  return acceptedProblemIds.has(Number(review.problemId)) ? review : undefined;
}

export async function getReviewableSubmission(submissionId) {
  await delay();

  return getAcceptedSubmission(submissionId);
}

export async function getCodeReviewProblemOptions(keyword = "") {
  await delay();

  const [problems, submissions] = await Promise.all([
    getProblemOptions(),
    getSubmissionList(),
  ]);
  const acceptedSubmissions = submissions.filter(
    (submission) => submission.result === ACCEPTED_RESULT,
  );
  const acceptedProblemIds = new Set(
    acceptedSubmissions.map((submission) => Number(submission.problemId)),
  );
  const normalizedKeyword = String(keyword ?? "").trim().toLowerCase();

  return problems
    .map((problem) => {
      const latestSubmission = acceptedSubmissions.find(
        (submission) => Number(submission.problemId) === Number(problem.id),
      );

      return {
        ...problem,
        isSolved: acceptedProblemIds.has(Number(problem.id)),
        latestAcceptedSubmissionId: latestSubmission?.id ?? "",
      };
    })
    .filter((problem) => {
      if (!normalizedKeyword) {
        return true;
      }

      return (
        String(problem.id).includes(normalizedKeyword) ||
        String(problem.title).toLowerCase().includes(normalizedKeyword) ||
        String(problem.tier).toLowerCase().includes(normalizedKeyword)
      );
    });
}

export async function addCodeReviewComment(reviewId, { line, body }) {
  await delay();

  const user = await getCurrentUser();
  const reviews = getStoredReviews();
  const review = reviews.find((item) => item.id === reviewId);

  if (!review) {
    throw createCodeReviewError("코드 리뷰를 찾을 수 없습니다.", "REVIEW_NOT_FOUND");
  }

  await assertCanReviewProblem(review.problemId);
  assertReviewOpen(review);

  const comment = {
    id: `human-comment-${Date.now()}`,
    authorType: "human",
    authorId: user?.id ?? "",
    authorName: user?.name ?? "익명",
    line: Number(line),
    body: String(body ?? "").trim(),
    createdAt: new Date().toISOString(),
  };

  if (!comment.body) {
    throw createCodeReviewError("라인 코멘트를 입력해주세요.", "EMPTY_COMMENT");
  }

  const nextReview = {
    ...review,
    comments: [...review.comments, comment],
    updatedAt: new Date().toISOString(),
  };

  saveReviews(reviews.map((item) => (item.id === reviewId ? nextReview : item)));

  return nextReview;
}

export async function addCodeReviewSuggestion(
  reviewId,
  { title, description, code },
) {
  await delay();

  const user = await getCurrentUser();
  const reviews = getStoredReviews();
  const review = reviews.find((item) => item.id === reviewId);

  if (!review) {
    throw createCodeReviewError("코드 리뷰를 찾을 수 없습니다.", "REVIEW_NOT_FOUND");
  }

  await assertCanReviewProblem(review.problemId);
  assertReviewOpen(review);

  const suggestion = {
    id: `human-suggestion-${Date.now()}`,
    authorType: "human",
    authorId: user?.id ?? "",
    authorName: user?.name ?? "익명",
    title: String(title ?? "").trim(),
    description: String(description ?? "").trim(),
    code: String(code ?? ""),
    recommendedBy: [],
    recommendationCount: 0,
    createdAt: new Date().toISOString(),
  };

  if (!suggestion.title || !suggestion.code.trim()) {
    throw createCodeReviewError(
      "제안 제목과 코드를 입력해주세요.",
      "EMPTY_SUGGESTION",
    );
  }

  const nextReview = {
    ...review,
    suggestions: [...review.suggestions, suggestion],
    updatedAt: new Date().toISOString(),
  };

  saveReviews(reviews.map((item) => (item.id === reviewId ? nextReview : item)));

  return nextReview;
}

export async function recommendCodeReviewSuggestion(reviewId, suggestionId) {
  await delay();

  const user = await getCurrentUser();

  if (!user) {
    throw createCodeReviewError("로그인 후 추천할 수 있습니다.", "AUTH_REQUIRED");
  }

  const reviews = getStoredReviews();
  const review = reviews.find((item) => item.id === reviewId);

  if (!review) {
    throw createCodeReviewError("코드 리뷰를 찾을 수 없습니다.", "REVIEW_NOT_FOUND");
  }

  await assertCanReviewProblem(review.problemId);
  assertReviewOpen(review);

  const hasSuggestion = review.suggestions.some(
    (suggestion) => suggestion.id === suggestionId,
  );

  if (!hasSuggestion) {
    throw createCodeReviewError("코드 제안을 찾을 수 없습니다.", "SUGGESTION_NOT_FOUND");
  }

  const nextReview = {
    ...review,
    suggestions: review.suggestions.map((suggestion) => {
      if (suggestion.id !== suggestionId) {
        return suggestion;
      }

      const recommendedBy = suggestion.recommendedBy.includes(user.id)
        ? suggestion.recommendedBy.filter((userId) => userId !== user.id)
        : [...suggestion.recommendedBy, user.id];

      return {
        ...suggestion,
        recommendedBy,
        recommendationCount: recommendedBy.length,
      };
    }),
    updatedAt: new Date().toISOString(),
  };

  saveReviews(reviews.map((item) => (item.id === reviewId ? nextReview : item)));

  return nextReview;
}

export async function acceptCodeReviewSuggestion(reviewId, suggestionId) {
  await delay();

  const user = await getCurrentUser();

  if (!user) {
    throw createCodeReviewError("로그인 후 채택할 수 있습니다.", "AUTH_REQUIRED");
  }

  const reviews = getStoredReviews();
  const review = reviews.find((item) => item.id === reviewId);

  if (!review) {
    throw createCodeReviewError("코드 리뷰를 찾을 수 없습니다.", "REVIEW_NOT_FOUND");
  }

  await assertCanReviewProblem(review.problemId);
  assertReviewOpen(review);

  if (review.authorId && review.authorId !== user.id) {
    throw createCodeReviewError("리뷰 작성자만 제안을 채택할 수 있습니다.", "ACCEPT_FORBIDDEN");
  }

  const hasSuggestion = review.suggestions.some(
    (suggestion) => suggestion.id === suggestionId,
  );

  if (!hasSuggestion) {
    throw createCodeReviewError("코드 제안을 찾을 수 없습니다.", "SUGGESTION_NOT_FOUND");
  }

  const nextReview = {
    ...review,
    acceptedSuggestionId: suggestionId,
    updatedAt: new Date().toISOString(),
  };

  saveReviews(reviews.map((item) => (item.id === reviewId ? nextReview : item)));

  return nextReview;
}

export async function setCodeReviewClosed(reviewId, isClosed) {
  await delay();

  const user = await getCurrentUser();
  const reviews = getStoredReviews();
  const review = reviews.find((item) => item.id === reviewId);

  if (!review) {
    throw createCodeReviewError("코드 리뷰를 찾을 수 없습니다.", "REVIEW_NOT_FOUND");
  }

  await assertCanReviewProblem(review.problemId);
  assertCanManageReview(review, user);

  const nextIsClosed = Boolean(isClosed);
  const nextReview = {
    ...review,
    isClosed: nextIsClosed,
    closedAt: nextIsClosed ? new Date().toISOString() : "",
    updatedAt: new Date().toISOString(),
  };

  saveReviews(reviews.map((item) => (item.id === reviewId ? nextReview : item)));

  return nextReview;
}

export function getAcceptedSuggestionRewardXp(userId = getCurrentUserId()) {
  if (!userId) {
    return 0;
  }

  return getStoredReviews().reduce((totalXp, review) => {
    const acceptedSuggestion = review.suggestions.find(
      (suggestion) => suggestion.id === review.acceptedSuggestionId,
    );

    if (!acceptedSuggestion || acceptedSuggestion.authorId !== userId) {
      return totalXp;
    }

    return totalXp + 2;
  }, 0);
}
