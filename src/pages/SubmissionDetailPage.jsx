import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  formatSubmittedAt,
  getLanguageLabel,
  getProblem,
  getSubmission,
  getVerdictLabel,
  getVerdictTone,
} from "../api/JudgeApi";
import "./ProblemSubmissionsPage.css";

function SubmissionDetailPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [problemTitle, setProblemTitle] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function fetchSubmission() {
      setSubmission(null);
      setError("");

      try {
        const nextSubmission = await getSubmission(submissionId);

        if (ignore) {
          return;
        }

        setSubmission(nextSubmission);
        // 제목은 화면 표시용이라 문제 조회가 실패해도 제출 상세는 보여준다
        getProblem(nextSubmission.problemId)
          .then((problem) => !ignore && setProblemTitle(problem.title))
          .catch(() => {});
      } catch (fetchError) {
        if (ignore) {
          return;
        }

        if (fetchError.status === 401) {
          navigate("/login", {
            replace: true,
            state: {
              from: `/submissions/${submissionId}`,
              message: "로그인이 만료되었습니다. 다시 로그인해주세요.",
            },
          });
          return;
        }

        setError(
          [403, 404].includes(fetchError.status)
            ? "제출 기록을 찾을 수 없습니다."
            : fetchError.message,
        );
      }
    }

    fetchSubmission();

    return () => {
      ignore = true;
    };
  }, [submissionId, navigate]);

  const codeLines = useMemo(
    () => String(submission?.code ?? "").split("\n"),
    [submission],
  );

  if (error) {
    return (
      <main className="submission-state">
        <p>{error}</p>
        <Link to="/submissions">제출 기록으로 돌아가기</Link>
      </main>
    );
  }

  if (!submission) {
    return <main className="submission-state">제출 상세를 불러오는 중입니다.</main>;
  }

  const title = problemTitle || `문제 ${submission.problemId}`;

  return (
    <main className="submission-detail">
      <header className="submission-history__bar">
        <h1>제출 #{submission.id}</h1>
        <div className="submission-history__bar-actions">
          <Link
            to={`/submissions?problemId=${submission.problemId}`}
            className="submission-history__back"
          >
            이 문제의 제출 기록
          </Link>
          <Link
            to={`/problems/${submission.problemId}/submit?submissionId=${submission.id}`}
            className="submission-detail__edit-link"
          >
            코드 수정하기
          </Link>
        </div>
      </header>

      <section className="submission-summary">
        <p className="submission-summary__eyebrow">{title}</p>
        <h2 className={`submission-summary__verdict ${getVerdictTone(submission.verdict)}`}>
          {getVerdictLabel(submission.verdict)}
        </h2>
        <p>{formatSubmittedAt(submission.createdAt)}에 제출한 코드입니다.</p>
      </section>

      <section className="submission-detail__layout">
        <article className="submission-detail__code-card">
          <div className="submission-detail__code-head">
            <strong>{getLanguageLabel(submission.language)}</strong>
            <small>{codeLines.length.toLocaleString()}줄</small>
          </div>
          <div className="submission-detail__code" role="table" aria-label="제출 코드">
            {codeLines.map((line, index) => (
              <div className="submission-detail__code-line" role="row" key={index}>
                <span role="cell">{index + 1}</span>
                <code role="cell">{line || " "}</code>
              </div>
            ))}
          </div>
        </article>

        <aside className="submission-detail__side">
          <article className="submission-detail__metric-card">
            <span>통과한 테스트</span>
            <strong>
              {submission.passedCount} / {submission.totalCount}
            </strong>
          </article>
          <article className="submission-detail__metric-card">
            <span>실행 시간</span>
            <strong>{submission.runtimeMs}ms</strong>
          </article>
          <article className="submission-detail__metric-card">
            <span>언어</span>
            <strong>{getLanguageLabel(submission.language)}</strong>
          </article>
          {submission.message && (
            <article className="submission-detail__metric-card">
              <span>채점 메시지</span>
              <pre className="submission-detail__message">{submission.message}</pre>
            </article>
          )}
        </aside>
      </section>
    </main>
  );
}

export default SubmissionDetailPage;
