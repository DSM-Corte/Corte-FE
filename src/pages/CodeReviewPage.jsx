import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  getCodeReviewList,
  getCodeReviewProblemOptions,
} from "../api/CodeReviewApi";
import "./CodeReviewPage.css";

function formatDate(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function CodeReviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedProblemId = searchParams.get("problemId") ?? "";
  const [reviews, setReviews] = useState([]);
  const [problemOptions, setProblemOptions] = useState([]);
  const [selectedProblemSnapshot, setSelectedProblemSnapshot] = useState(null);
  const [problemKeyword, setProblemKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isProblemLoading, setIsProblemLoading] = useState(true);

  const selectedProblem = useMemo(
    () => {
      if (
        selectedProblemSnapshot &&
        String(selectedProblemSnapshot.id) === String(selectedProblemId)
      ) {
        return selectedProblemSnapshot;
      }

      return problemOptions.find(
        (problem) => String(problem.id) === String(selectedProblemId),
      );
    },
    [problemOptions, selectedProblemId, selectedProblemSnapshot],
  );

  useEffect(() => {
    let ignore = false;

    async function fetchReviews() {
      setIsLoading(true);
      const nextReviews = await getCodeReviewList({
        problemId: selectedProblemId || undefined,
      });

      if (ignore) {
        return;
      }

      setReviews(nextReviews);
      setIsLoading(false);
    }

    fetchReviews();

    return () => {
      ignore = true;
    };
  }, [selectedProblemId]);

  useEffect(() => {
    let ignore = false;

    async function fetchProblemOptions() {
      setIsProblemLoading(true);
      const nextOptions = await getCodeReviewProblemOptions(problemKeyword);

      if (ignore) {
        return;
      }

      setProblemOptions(nextOptions);
      setIsProblemLoading(false);
    }

    fetchProblemOptions();

    return () => {
      ignore = true;
    };
  }, [problemKeyword]);

  function selectProblem(problem) {
    if (!problem.isSolved) {
      return;
    }

    setSearchParams({ problemId: String(problem.id) });
    setSelectedProblemSnapshot(problem);
    setProblemKeyword(`${problem.id}. ${problem.title}`);
  }

  function clearProblemFilter() {
    setSearchParams({});
    setSelectedProblemSnapshot(null);
    setProblemKeyword("");
  }

  return (
    <main className="code-review-page">
      <section className="code-review-hero">
        <p className="code-review-hero__eyebrow">Code Review</p>
        <h1>코드를 다시 읽고 개선점을 남겨보세요</h1>
        <p>
          정답 처리된 제출 코드를 기준으로 리뷰를 만들고, 라인 코멘트와 제안
          코드를 함께 관리합니다.
        </p>
      </section>

      <section className="code-review-shell">
        <div className="code-review-list-head">
          <div>
            <h2>코드 리뷰 목록</h2>
            <p>
              내가 푼 문제의 코드 리뷰를 모아보고, 필요한 문제만 검색해서
              좁혀볼 수 있습니다.
            </p>
          </div>
          <Link to="/problems">정답 제출 찾기</Link>
        </div>

        <section className="code-review-filter-panel" aria-label="코드 리뷰 문제 검색">
          <div className="code-review-related-problem-field">
            <div className="code-review-filter-label-row">
              <span>문제</span>
            </div>

            <div className="code-review-problem-search">
              <div className="code-review-problem-search__input">
                <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m16 16 4 4" />
                </svg>
                <input
                  value={problemKeyword}
                  onChange={(event) => setProblemKeyword(event.target.value)}
                  placeholder="문제 번호 또는 제목 검색"
                  aria-label="코드 리뷰 문제 검색"
                />
              </div>

              {selectedProblem ? (
                <div className="code-review-selected-problem">
                  <span>
                    #{selectedProblem.id} {selectedProblem.title}
                  </span>
                  <Link
                    to={`/code-review/new?submissionId=${encodeURIComponent(
                      selectedProblem.latestAcceptedSubmissionId,
                    )}`}
                  >
                    리뷰 작성
                  </Link>
                  <button
                    type="button"
                    onClick={clearProblemFilter}
                    aria-label="선택 문제 제거"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="code-review-problem-results">
                  {isProblemLoading ? (
                    <p>문제를 검색하는 중입니다.</p>
                  ) : problemOptions.length === 0 ? (
                    <p>검색된 문제가 없습니다.</p>
                  ) : (
                    problemOptions.slice(0, 5).map((problem) => (
                      <button
                        type="button"
                        disabled={!problem.isSolved}
                        onClick={() => selectProblem(problem)}
                        key={problem.id}
                      >
                        <strong>
                          {problem.id}. {problem.title}
                        </strong>
                        <small>
                          {problem.isSolved ? problem.tier : "정답 제출 필요"}
                        </small>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {isLoading ? (
          <p className="code-review-empty">코드 리뷰를 불러오는 중입니다.</p>
        ) : reviews.length === 0 ? (
          <div className="code-review-empty">
            {selectedProblemId
              ? "선택한 문제에 대한 코드 리뷰가 없습니다."
              : "내가 푼 문제에서 생성된 코드 리뷰가 없습니다. 정답 제출 기록에서 리뷰를 시작해보세요."}
          </div>
        ) : (
          <div className="code-review-list">
            {reviews.map((review) => (
              <Link
                to={`/code-review/${review.id}`}
                className={`code-review-list-item ${
                  review.isClosed ? "code-review-list-item--closed" : ""
                }`.trim()}
                key={review.id}
              >
                <span>#{review.problemId}</span>
                <strong>{review.title}</strong>
                <p>{review.problemTitle}</p>
                <small>
                  {review.isClosed && <em>닫힘</em>}
                  {formatDate(review.createdAt)}
                </small>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default CodeReviewPage;
