import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { isAuthenticated } from "../api/AuthApi";
import { getProblem } from "../api/JudgeApi";
import { toWorkbookProblem } from "../api/ProblemSetApi";
import ProblemStatement from "../components/problems/ProblemStatement";
import TierBadge from "../components/problems/TierBadge";
import "./ProblemDetailPage.css";

function ProblemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const problem = result?.problem;

  useEffect(() => {
    const controller = new AbortController();

    async function loadProblem() {
      try {
        const problem = toWorkbookProblem(await getProblem(id));
        if (!controller.signal.aborted) setResult({ id, problem });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ id, error: error.status !== 404 });
      }
    }

    loadProblem();
    return () => controller.abort();
  }, [id]);

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

  if (result?.id !== id) {
    return <main className="problem-detail-state">문제를 불러오는 중입니다.</main>;
  }

  if (!problem) {
    return (
      <main className="problem-detail-state">
        <p>{result.error ? "문제를 불러오지 못했습니다." : "문제를 찾을 수 없습니다."}</p>
        <Link to="/problems">문제 목록으로 돌아가기</Link>
      </main>
    );
  }

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
          <span>시간 제한 {problem.timeLimitMs} ms</span>
          <span>메모리 제한 {problem.memoryLimitMb} MB</span>
        </div>
      </section>

      <section className="problem-detail__body">
        <article className="problem-detail__main">
          <ProblemStatement description={problem.description} />
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
