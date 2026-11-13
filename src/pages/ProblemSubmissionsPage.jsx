import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import {
  formatSubmittedAt,
  getLanguageLabel,
  getMySubmissions,
  getVerdictLabel,
  getVerdictTone,
} from "../api/JudgeApi";
import "./ProblemSubmissionsPage.css";

function ProblemSubmissionsPage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const problemId = id ?? searchParams.get("problemId") ?? "";
  const pageNumber = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);

  useEffect(() => {
    let ignore = false;

    async function fetchSubmissions() {
      setResult(null);
      setError("");

      try {
        const nextResult = await getMySubmissions({ problemId, page: pageNumber - 1 });

        if (!ignore) {
          setResult(nextResult);
        }
      } catch (fetchError) {
        if (ignore) {
          return;
        }

        if (fetchError.status === 401) {
          navigate("/login", {
            replace: true,
            state: {
              from: `${location.pathname}${location.search}`,
              message: "로그인이 만료되었습니다. 다시 로그인해주세요.",
            },
          });
          return;
        }

        setError(fetchError.message);
      }
    }

    fetchSubmissions();

    return () => {
      ignore = true;
    };
  }, [problemId, pageNumber, navigate, location.pathname, location.search]);

  function movePage(nextPageNumber) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("page", String(nextPageNumber));
    setSearchParams(nextParams);
  }

  if (error) {
    return (
      <main className="submission-state">
        <p>{error}</p>
        <Link to="/submissions">전체 제출 기록 보기</Link>
      </main>
    );
  }

  if (!result) {
    return <main className="submission-state">제출 기록을 불러오는 중입니다.</main>;
  }

  const submissions = result.content;
  const problemTitle = submissions[0]?.problemTitle;
  const isFiltered = Boolean(problemId);
  const totalPages = Math.max(1, result.totalPages);

  return (
    <main className="submission-history">
      <header className="submission-history__bar">
        <h1>제출 기록</h1>
        <Link
          to={isFiltered ? `/problems/${problemId}` : "/problems"}
          className="submission-history__back"
        >
          {isFiltered ? "문제로 돌아가기" : "문제 목록"}
        </Link>
      </header>

      <section className="submission-summary">
        <p className="submission-summary__eyebrow">
          {isFiltered ? `문제 ${problemId}` : "내 제출"}
        </p>
        <h2>{isFiltered ? problemTitle ?? `문제 ${problemId}` : "전체 제출 기록"}</h2>
        <p>
          총 {result.totalElements.toLocaleString()}개의 제출이 있습니다. 제출을 열면
          채점 결과와 제출했던 코드를 다시 볼 수 있습니다.
        </p>
        {isFiltered && (
          <Link to="/submissions" className="submission-summary__link">
            전체 제출 기록 보기
          </Link>
        )}
      </section>

      <section className="submission-list-section">
        <div className="submission-table" role="table" aria-label="제출 기록">
          <div className="submission-table__row submission-table__row--head" role="row">
            <span role="columnheader">제출 번호</span>
            <span role="columnheader">문제</span>
            <span role="columnheader">결과</span>
            <span role="columnheader">통과</span>
            <span role="columnheader">언어</span>
            <span role="columnheader">시간</span>
            <span role="columnheader">작업</span>
          </div>

          {submissions.map((submission) => (
            <article className="submission-table__row" role="row" key={submission.id}>
              <span className="submission-table__number" role="cell">
                #{submission.id}
              </span>
              <span role="cell">
                <strong>{submission.problemTitle}</strong>
                <small>{formatSubmittedAt(submission.createdAt)}</small>
              </span>
              <span
                className={`submission-status ${getVerdictTone(submission.verdict)}`}
                role="cell"
              >
                {getVerdictLabel(submission.verdict)}
              </span>
              <span role="cell">
                {submission.passedCount} / {submission.totalCount}
              </span>
              <span role="cell">
                <span className="submission-language">
                  {getLanguageLabel(submission.language)}
                </span>
              </span>
              <span role="cell">{submission.runtimeMs}ms</span>
              <span className="submission-actions" role="cell">
                <Link
                  to={`/submissions/${submission.id}`}
                  aria-label={`${submission.problemTitle} 제출 상세 보기`}
                >
                  상세
                </Link>
                <Link
                  to={`/problems/${submission.problemId}/submit?submissionId=${submission.id}`}
                  aria-label={`${submission.problemTitle} 제출 코드 수정하기`}
                >
                  수정하기
                </Link>
              </span>
            </article>
          ))}

          {submissions.length === 0 && (
            <div className="submission-table__empty" role="row">
              {isFiltered
                ? "이 문제에 대한 제출 기록이 없습니다."
                : "아직 제출 기록이 없습니다."}
            </div>
          )}
        </div>

        {result.totalPages > 1 && (
          <nav className="submission-pagination" aria-label="제출 기록 페이지">
            <button
              type="button"
              disabled={pageNumber <= 1}
              onClick={() => movePage(pageNumber - 1)}
            >
              이전
            </button>
            <span>
              {pageNumber} / {totalPages}
            </span>
            <button
              type="button"
              disabled={pageNumber >= totalPages}
              onClick={() => movePage(pageNumber + 1)}
            >
              다음
            </button>
          </nav>
        )}
      </section>
    </main>
  );
}

export default ProblemSubmissionsPage;
