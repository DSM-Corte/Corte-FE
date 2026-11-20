import { useEffect, useState } from "react";
import { createAiReview, getAiReview } from "../../api/AiReviewApi";

const ERROR_MESSAGES = {
  I002: "이미 AI 리뷰가 만들어졌습니다. 새로고침해 주세요.",
  I003: "AI 리뷰가 아직 설정되지 않았습니다. 관리자에게 문의해 주세요.",
  I004: "AI 서버 호출에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  I005: "AI 응답을 해석하지 못했습니다. 잠시 후 다시 시도해 주세요.",
};

function getErrorMessage(error) {
  return ERROR_MESSAGES[error.code] ?? error.message;
}

function AiReviewPanel({ submissionId, onReviewChange }) {
  const [review, setReview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function fetchReview() {
      setIsLoading(true);
      setError("");
      setReview(null);
      onReviewChange?.(null);

      try {
        const nextReview = await getAiReview(submissionId);

        if (!ignore) {
          setReview(nextReview);
          onReviewChange?.(nextReview);
        }
      } catch (fetchError) {
        if (!ignore) {
          setError(getErrorMessage(fetchError));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    fetchReview();

    return () => {
      ignore = true;
    };
  }, [submissionId, onReviewChange]);

  async function handleCreate() {
    setIsCreating(true);
    setError("");

    try {
      const nextReview = await createAiReview(submissionId);
      setReview(nextReview);
      onReviewChange?.(nextReview);
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <article className="submission-detail__metric-card ai-review">
      <span>AI 리뷰</span>

      {isLoading && <p className="ai-review__hint">불러오는 중입니다.</p>}

      {!isLoading && !review && (
        <button
          type="button"
          className="ai-review__button"
          onClick={handleCreate}
          disabled={isCreating}
        >
          {isCreating ? "AI가 코드를 읽는 중입니다..." : "AI 리뷰 받기"}
        </button>
      )}

      {error && (
        <p className="ai-review__error" role="alert">
          {error}
        </p>
      )}

      {review && (
        <div className="ai-review__body">
          <p className="ai-review__summary">{review.summary}</p>

          {review.suggestion && (
            <section className="ai-review__suggestion">
              <strong>{review.suggestion.title}</strong>
              <p>{review.suggestion.description}</p>
              {review.suggestion.code && <pre>{review.suggestion.code}</pre>}
            </section>
          )}

          <small>
            {review.comments?.length ?? 0}개의 줄 코멘트는 코드 아래에 표시됩니다.
          </small>
        </div>
      )}
    </article>
  );
}

export default AiReviewPanel;
