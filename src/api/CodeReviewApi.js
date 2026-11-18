import { request } from "./apiClient";

export const CODE_REVIEW_PAGE_SIZE = 20;

const BASE = "/api/review-requests";

function reviewPath(id, suffix = "") {
  return `${BASE}/${encodeURIComponent(id)}${suffix}`;
}

function pageQuery({ page = 0, size = CODE_REVIEW_PAGE_SIZE, ...rest } = {}) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });

  Object.entries(rest).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  return params;
}

// 리뷰 요청 -----------------------------------------------------------

export function createReviewRequest(submissionId) {
  return request(BASE, {
    method: "POST",
    body: { submissionId: Number(submissionId) },
  });
}

// 닫히지 않은 요청과 내가 요청한 요청이 최신순으로 온다
export function getReviewRequests({ problemId, page, size } = {}) {
  return request(`${BASE}?${pageQuery({ page, size, problemId })}`);
}

export function getReviewRequest(id) {
  return request(reviewPath(id));
}

export function closeReviewRequest(id) {
  return request(reviewPath(id, "/close"), { method: "POST" });
}

// 코멘트 하나를 골라 적용한 전체 코드를 돌려준다. 서버에 저장하지 않는다
export async function applyLineComment(id, lineCommentId) {
  const result = await request(reviewPath(id, "/apply"), {
    method: "POST",
    body: { lineCommentIds: [Number(lineCommentId)] },
  });

  return result.code;
}

// 줄 코멘트 -----------------------------------------------------------

export function getLineComments(id) {
  return request(reviewPath(id, "/line-comments"));
}

export function createLineComment(id, { lineNumber, content, suggestedCode }) {
  return request(reviewPath(id, "/line-comments"), {
    method: "POST",
    body: {
      lineNumber: Number(lineNumber),
      content,
      suggestedCode: suggestedCode?.trim() ? suggestedCode : undefined,
    },
  });
}

export function updateLineComment(id, commentId, { content, suggestedCode }) {
  return request(reviewPath(id, `/line-comments/${encodeURIComponent(commentId)}`), {
    method: "PATCH",
    body: { content, suggestedCode },
  });
}

export function deleteLineComment(id, commentId) {
  return request(reviewPath(id, `/line-comments/${encodeURIComponent(commentId)}`), {
    method: "DELETE",
  });
}

// 전체 댓글 -----------------------------------------------------------

export function getComments(id, { page, size } = {}) {
  return request(reviewPath(id, `/comments?${pageQuery({ page, size })}`));
}

export function createComment(id, content) {
  return request(reviewPath(id, "/comments"), {
    method: "POST",
    body: { content },
  });
}

export function updateComment(id, commentId, content) {
  return request(reviewPath(id, `/comments/${encodeURIComponent(commentId)}`), {
    method: "PATCH",
    body: { content },
  });
}

export function deleteComment(id, commentId) {
  return request(reviewPath(id, `/comments/${encodeURIComponent(commentId)}`), {
    method: "DELETE",
  });
}

// 답글 ----------------------------------------------------------------

// kind: "line-comments" | "comments"
export function createReply(id, kind, commentId, content) {
  return request(reviewPath(id, `/${kind}/${encodeURIComponent(commentId)}/replies`), {
    method: "POST",
    body: { content },
  });
}

export function updateReply(id, replyId, content) {
  return request(reviewPath(id, `/replies/${encodeURIComponent(replyId)}`), {
    method: "PATCH",
    body: { content },
  });
}

export function deleteReply(id, replyId) {
  return request(reviewPath(id, `/replies/${encodeURIComponent(replyId)}`), {
    method: "DELETE",
  });
}
