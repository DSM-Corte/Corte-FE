import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { getReviewRequests } from "../api/CodeReviewApi";
import { formatSubmittedAt, getLanguageLabel } from "../api/JudgeApi";
import "./CodeReviewPage.css";

function CodeReviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const problemId = searchParams.get("problemId") ?? "";
  const page = Number(searchParams.get("page") ?? 0) || 0;
  const [problemInput, setProblemInput] = useState(problemId);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function fetchReviews() {
      setResult(null);
      setError("");

      try {
        const nextResult = await getReviewRequests({
          problemId: problemId || undefined,
          page,
        });

        if (!ignore) {
          setResult(nextResult);
        }
      } catch (fetchError) {
        if (!ignore) {
          setError(fetchError.message);
        }
      }
    }

    fetchReviews();

    return () => {
      ignore = true;
    };
  }, [problemId, page]);

  function handleFilterSubmit(event) {
    event.preventDefault();
    const nextProblemId = problemInput.trim();

    setSearchParams(nextProblemId ? { problemId: nextProblemId } : {});
  }

  function movePage(nextPage) {
    const params = {};

    if (problemId) {
      params.problemId = problemId;
    }

    if (nextPage > 0) {
      params.page = String(nextPage);
    }

    setSearchParams(params);
  }

  const reviews = result?.content ?? [];

  return (
    <main className="code-review-page">
      <section className="code-review-hero">
        <p className="code-review-hero__eyebrow">Code Review</p>
        <h1>코드를 다시 읽고 개선점을 남겨보세요</h1>
        <p>
          정답 처리된 제출 코드로 리뷰를 요청하고, 줄 코멘트와 제안 코드로
          리뷰를 주고받습니다.
        </p>
      </section>

      <section className="code-review-shell">
        <div className="code-review-list-head">
          <div>
            <h2>리뷰 요청 목록</h2>
            <p>열려 있는 리뷰 요청과 내가 요청한 리뷰를 최신순으로 보여줍니다.</p>
          </div>
          <Link to="/submissions">내 제출에서 리뷰 요청하기</Link>
        </div>

        <form
          className="code-review-filter-panel"
          aria-label="코드 리뷰 문제 필터"
          onSubmit={handleFilterSubmit}
        >
          <div className="code-review-problem-search__input">
            <input
              value={problemInput}
              onChange={(event) => setProblemInput(event.target.value)}
              placeholder="문제 번호로 필터"
              inputMode="numeric"
              aria-label="문제 번호"
            />
          </div>
          <button type="submit">검색</button>
          {problemId && (
            <button
              type="button"
              onClick={() => {
                setProblemInput("");
                setSearchParams({});
              }}
            >
              필터 해제
            </button>
          )}
        </form>

        {error ? (
          <p className="code-review-empty">{error}</p>
        ) : !result ? (
          <p className="code-review-empty">코드 리뷰를 불러오는 중입니다.</p>
        ) : reviews.length === 0 ? (
          <div className="code-review-empty">
            {problemId
              ? "선택한 문제에 대한 리뷰 요청이 없습니다."
              : "아직 리뷰 요청이 없습니다. 정답 제출 기록에서 리뷰를 요청해보세요."}
          </div>
        ) : (
          <div className="code-review-list">
            {reviews.map((review) => (
              <Link
                to={`/code-review/${review.id}`}
                className={`code-review-list-item ${
                  review.closed ? "code-review-list-item--closed" : ""
                }`.trim()}
                key={review.id}
              >
                <span>#{review.problemId}</span>
                <strong>{review.problemTitle}</strong>
                <p>
                  {review.requester} · {getLanguageLabel(review.language)}
                </p>
                <small>
                  {review.closed && <em>닫힘</em>}
                  {formatSubmittedAt(review.createdAt)}
                </small>
              </Link>
            ))}
          </div>
        )}

        {result && result.totalPages > 1 && (
          <nav className="code-review-pagination" aria-label="페이지 이동">
            <button
              type="button"
              disabled={result.page <= 0}
              onClick={() => movePage(result.page - 1)}
            >
              이전
            </button>
            <span>
              {result.page + 1} / {result.totalPages}
            </span>
            <button
              type="button"
              disabled={result.page + 1 >= result.totalPages}
              onClick={() => movePage(result.page + 1)}
            >
              다음
            </button>
          </nav>
        )}
      </section>
    </main>
  );
}

export default CodeReviewPage;
