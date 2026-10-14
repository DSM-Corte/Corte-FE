import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { getSubmissionById } from "../api/SubmissionApi";
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

function formatLanguage(language) {
  if (language === "javascript") {
    return "JavaScript";
  }

  if (language === "python") {
    return "Python";
  }

  return language;
}

function SubmissionDetailPage() {
  const { submissionId } = useParams();
  const [submission, setSubmission] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function fetchSubmission() {
      const nextSubmission = await getSubmissionById(submissionId);

      if (ignore) {
        return;
      }

      setSubmission(nextSubmission);
      setIsLoading(false);
    }

    fetchSubmission();

    return () => {
      ignore = true;
    };
  }, [submissionId]);

  const codeLines = useMemo(
    () => String(submission?.code ?? "").split("\n"),
    [submission],
  );

  if (isLoading) {
    return <main className="submission-state">제출 상세를 불러오는 중입니다.</main>;
  }

  if (!submission) {
    return (
      <main className="submission-state">
        <p>제출 기록을 찾을 수 없습니다.</p>
        <Link to="/submissions">제출 기록으로 돌아가기</Link>
      </main>
    );
  }

  return (
    <main className="submission-detail">
      <header className="submission-history__bar">
        <div>
          <Link
            to={`/submissions?problemId=${encodeURIComponent(submission.problemId)}`}
            className="submission-history__back"
          >
            제출 기록으로 돌아가기
          </Link>
          <h1>{submission.problemTitle}</h1>
        </div>
        <Link
          to={`/problems/${submission.problemId}/submit?submissionId=${encodeURIComponent(
            submission.id,
          )}`}
          className="submission-detail__edit-link"
        >
          코드 수정하기
        </Link>
      </header>

      <section className="submission-summary">
        <p className="submission-summary__eyebrow">Submission Detail</p>
        <h2>{submission.result}</h2>
        <p>
          {formatSubmittedAt(submission.submittedAt)} 제출한 코드를 확인하고,
          필요하면 같은 코드로 다시 수정할 수 있습니다.
        </p>
      </section>

      <section className="submission-detail__layout">
        <article className="submission-detail__code-card">
          <div className="submission-detail__code-head">
            <div>
              <span>{formatLanguage(submission.language)}</span>
              <strong>solutions/{submission.problemId}.{submission.language === "python" ? "py" : "js"}</strong>
            </div>
            <small>{codeLines.length.toLocaleString()} lines</small>
          </div>
          <div className="submission-detail__code" role="table" aria-label="제출 코드">
            {codeLines.map((line, index) => (
              <div className="submission-detail__code-line" role="row" key={`${index}-${line}`}>
                <span role="cell">{index + 1}</span>
                <code role="cell">{line || " "}</code>
              </div>
            ))}
          </div>
        </article>

        <aside className="submission-detail__side">
          <article className="submission-detail__metric-card">
            <span>언어</span>
            <strong>{formatLanguage(submission.language)}</strong>
          </article>
          <article className="submission-detail__metric-card">
            <span>시간</span>
            <strong>{submission.runtimeMs}ms</strong>
          </article>
          <article className="submission-detail__metric-card">
            <span>메모리</span>
            <strong>{formatMemory(submission.memoryKb)}</strong>
          </article>
          <article className="submission-detail__test-card">
            <h2>예제 결과</h2>
            {(submission.testResults ?? []).map((testResult) => (
              <div className="submission-detail__test" key={testResult.title}>
                <div>
                  <strong>{testResult.title}</strong>
                  <span>{testResult.passed ? "통과" : "실패"}</span>
                </div>
                <dl>
                  <dt>출력</dt>
                  <dd>{testResult.output || "(빈 출력)"}</dd>
                  <dt>기대값</dt>
                  <dd>{testResult.expected || "(빈 출력)"}</dd>
                </dl>
              </div>
            ))}
          </article>
        </aside>
      </section>
    </main>
  );
}

export default SubmissionDetailPage;
