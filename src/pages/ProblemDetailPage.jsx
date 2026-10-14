import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { isAuthenticated } from "../api/AuthApi";
import { getProblemById } from "../api/ProblemApi";
import ProblemExampleList from "../components/problems/ProblemExampleList";
import TierBadge from "../components/problems/TierBadge";
import { writeClipboardText } from "../utils/clipboard";
import "./ProblemDetailPage.css";

function getAcceptanceRate(problem) {
  const estimatedSubmissions = problem.solvedCount * problem.averageTries;
  return Math.min((problem.solvedCount / estimatedSubmissions) * 100, 100);
}

function getSubmissionCount(problem) {
  return Math.round(problem.solvedCount * problem.averageTries);
}

function ProblemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [problem, setProblem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState("");

  useEffect(() => {
    async function fetchProblem() {
      setProblem(await getProblemById(id));
      setIsLoading(false);
    }

    fetchProblem();
  }, [id]);

  async function copyExampleValue(key, value) {
    try {
      await writeClipboardText(value);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((currentKey) => (currentKey === key ? "" : currentKey));
      }, 1400);
    } catch {
      setCopiedKey("");
    }
  }

  function handleSubmitClick() {
    const submitPath = `/problems/${problem.id}/submit`;

    if (!isAuthenticated()) {
      navigate("/login", {
        state: {
          from: submitPath,
          message: "제출하려면 먼저 로그인해주세요.",
        },
      });
      return;
    }

    navigate(submitPath);
  }

  if (isLoading) {
    return <main className="problem-detail-state">문제를 불러오는 중입니다.</main>;
  }

  if (!problem) {
    return (
      <main className="problem-detail-state">
        <p>문제를 찾을 수 없습니다.</p>
        <Link to="/problems">문제 목록으로 돌아가기</Link>
      </main>
    );
  }

  const acceptanceRate = getAcceptanceRate(problem);
  const submissionCount = getSubmissionCount(problem);

  return (
    <main className="problem-detail">
      <header className="problem-detail__bar">
        <div className="problem-detail__bar-inner">
          <Link to="/problems" className="problem-detail__back">
            문제 목록
          </Link>
          <span className="problem-detail__bar-title">
            {problem.id}. {problem.title}
          </span>
        </div>
      </header>

      <section className="problem-detail__hero">
        <p className="problem-detail__eyebrow">Problem {problem.id}</p>
        <h1>{problem.title}</h1>
        <div className="problem-detail__meta">
          <Link
            to={`/problems?tier=${encodeURIComponent(problem.tier)}`}
            className="problem-detail__tier"
            aria-label={`${problem.tier} 문제 목록 보기`}
          >
            <TierBadge tier={problem.tier} showName />
          </Link>
          <span
            className={
              problem.solved
                ? "detail-status detail-status--inline is-solved"
                : "detail-status detail-status--inline"
            }
          >
            {problem.solved ? "해결 완료" : "미해결"}
          </span>
          <span>Acceptance Rate: {acceptanceRate.toFixed(1)}%</span>
          <span>Submissions: {submissionCount.toLocaleString()}</span>
        </div>
      </section>

      <section className="problem-detail__body">
        <article className="problem-detail__main">
          <p className="problem-detail__summary">{problem.detail.summary}</p>

          <div className="problem-detail__section">
            {problem.detail.description.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <div className="problem-detail__section">
            <h2>Examples</h2>
            <ProblemExampleList
              examples={problem.detail.examples}
              copiedKey={copiedKey}
              onCopy={copyExampleValue}
            />
          </div>

          <div className="problem-detail__section">
            <h2>Constraints</h2>
            <ul className="constraint-list">
              {problem.detail.constraints.map((constraint) => (
                <li key={constraint}>{constraint}</li>
              ))}
            </ul>
          </div>
        </article>

        <aside className="problem-detail__side">
          <section className="problem-detail__actions">
            <h2>풀이 작업</h2>
            <button
              type="button"
              className="button button--contained button--md detail-action-button"
              onClick={handleSubmitClick}
            >
              <span className="button_text">제출하기</span>
            </button>
            <Link
              to={`/submissions?problemId=${encodeURIComponent(problem.id)}`}
              className="detail-action-link"
            >
              내 제출 기록 보기
            </Link>
            <Link
              to={`/community?problemId=${problem.id}`}
              className="detail-action-link"
            >
              관련 게시글 보기
            </Link>
          </section>

          <section className="problem-detail__tag-card">
            <h2>태그</h2>
            <div className="detail-tag-list">
              {problem.tags.map((tag) => (
                <Link to={`/problems?tag=${encodeURIComponent(tag)}`} key={tag}>
                  {tag}
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

export default ProblemDetailPage;
