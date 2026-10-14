import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { isAuthenticated } from "../api/AuthApi";
import { getProblemById } from "../api/ProblemApi";
import { ACCEPTED_RESULT, getSubmissionList } from "../api/SubmissionApi";
import "./ProblemSubmissionsPage.css";

function formatMemory(memoryKb) {
  if (!memoryKb) {
    return "--";
  }

  return `${(memoryKb / 1024).toFixed(1)} MB`;
}

function formatSubmittedAt(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ProblemSubmissionsPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [problem, setProblem] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const queryProblemId = searchParams.get("problemId") ?? "";
  const filterProblemId = id ?? queryProblemId;
  const submissionListPath = useMemo(() => {
    if (!filterProblemId) {
      return "/submissions";
    }

    return `/submissions?problemId=${encodeURIComponent(filterProblemId)}`;
  }, [filterProblemId]);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login", {
        replace: true,
        state: {
          from: submissionListPath,
          message: "제출 기록을 보려면 먼저 로그인해주세요.",
        },
      });
      return;
    }

    let ignore = false;

    async function fetchSubmissions() {
      setIsLoading(true);

      const [nextProblem, nextSubmissions] = await Promise.all([
        filterProblemId ? getProblemById(filterProblemId) : Promise.resolve(null),
        getSubmissionList(filterProblemId ? { problemId: filterProblemId } : {}),
      ]);

      if (ignore) {
        return;
      }

      setProblem(nextProblem);
      setSubmissions(nextSubmissions);
      setIsLoading(false);
    }

    fetchSubmissions();

    return () => {
      ignore = true;
    };
  }, [filterProblemId, navigate, submissionListPath]);

  if (isLoading) {
    return <main className="submission-state">제출 기록을 불러오는 중입니다.</main>;
  }

  if (filterProblemId && !problem) {
    return (
      <main className="submission-state">
        <p>문제를 찾을 수 없습니다.</p>
        <Link to="/submissions">전체 제출 기록으로 돌아가기</Link>
      </main>
    );
  }

  const isFiltered = Boolean(problem);

  return (
    <main className="submission-history">
      <header className="submission-history__bar">
        <div>
          <Link
            to={isFiltered ? `/problems/${problem.id}` : "/problems"}
            className="submission-history__back"
          >
            {isFiltered ? "문제로 돌아가기" : "문제 목록"}
          </Link>
          <h1>제출 기록</h1>
        </div>
      </header>

      <section className="submission-summary">
        <div>
          <p className="submission-summary__eyebrow">
            {isFiltered ? "Filtered Submissions" : "All Submissions"}
          </p>
          <h2>{isFiltered ? problem.title : "전체 제출 기록"}</h2>
          <p>
            {isFiltered
              ? "이 문제에 대한 이전 제출 결과와 실행 성능을 확인하고, 정답 코드는 코드 리뷰로 이어갈 수 있습니다."
              : "내가 제출한 문제 풀이 기록을 한곳에서 확인하고, 필요한 제출 코드를 다시 수정할 수 있습니다."}
          </p>
        </div>
      </section>

      <section className="submission-list-section">
        <div className="submission-table" role="table" aria-label="제출 기록">
          <div className="submission-table__row submission-table__row--head" role="row">
            <span role="columnheader">No.</span>
            <span role="columnheader">문제</span>
            <span role="columnheader">상태</span>
            <span role="columnheader">언어</span>
            <span role="columnheader">시간</span>
            <span role="columnheader">메모리</span>
            <span role="columnheader">작업</span>
          </div>

          {submissions.map((submission, index) => {
            const isAccepted = submission.result === ACCEPTED_RESULT;

            return (
              <article className="submission-table__row" role="row" key={submission.id}>
                <span className="submission-table__number" role="cell">
                  #{submissions.length - index}
                </span>
                <span role="cell">
                  <strong>{submission.problemTitle}</strong>
                  <small>{formatSubmittedAt(submission.submittedAt)}</small>
                </span>
                <span
                  className={
                    isAccepted
                      ? "submission-status is-accepted"
                      : "submission-status is-failed"
                  }
                  role="cell"
                >
                  {isAccepted ? "✓" : "!"} {submission.result}
                </span>
                <span role="cell">
                  <span className="submission-language">{submission.language}</span>
                </span>
                <span role="cell">{submission.runtimeMs}ms</span>
                <span role="cell">{formatMemory(submission.memoryKb)}</span>
                <span className="submission-actions" role="cell">
                  <Link
                    to={`/submissions/${encodeURIComponent(submission.id)}`}
                    aria-label={`${submission.problemTitle} 제출 상세 보기`}
                  >
                    상세
                  </Link>
                  <Link
                    to={`/problems/${submission.problemId}/submit?submissionId=${encodeURIComponent(
                      submission.id,
                    )}`}
                    aria-label={`${submission.problemTitle} 제출 코드 수정하기`}
                  >
                    수정하기
                  </Link>
                  {isAccepted ? (
                    <Link
                      to={`/code-review/new?submissionId=${encodeURIComponent(
                        submission.id,
                      )}`}
                      aria-label={`${submission.problemTitle} 코드 리뷰받기`}
                    >
                      코드 리뷰받기
                    </Link>
                  ) : (
                    <span
                      className="submission-actions__disabled"
                      aria-label="정답 제출만 코드 리뷰를 받을 수 있습니다."
                    >
                      리뷰 불가
                    </span>
                  )}
                </span>
              </article>
            );
          })}

          {submissions.length === 0 && (
            <div className="submission-table__empty" role="row">
              {isFiltered
                ? "이 문제에 대한 제출 기록이 없습니다."
                : "아직 제출 기록이 없습니다."}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default ProblemSubmissionsPage;
