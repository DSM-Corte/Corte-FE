import { request } from "./apiClient";

function aiReviewPath(submissionId) {
  return `/api/submissions/${encodeURIComponent(submissionId)}/ai-review`;
}

// 아직 리뷰가 없으면(I001) null을 돌려준다
export async function getAiReview(submissionId) {
  try {
    return await request(aiReviewPath(submissionId));
  } catch (error) {
    if (error.status === 404 && error.code === "I001") {
      return null;
    }

    throw error;
  }
}

export function createAiReview(submissionId) {
  return request(aiReviewPath(submissionId), { method: "POST" });
}
