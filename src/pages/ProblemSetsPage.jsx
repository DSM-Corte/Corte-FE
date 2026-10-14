import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { getCustomProblemSets } from "../api/ProblemSetApi";
import { getProblemCatalog } from "../api/ProblemApi";
import TierBadge from "../components/problems/TierBadge";
import { problemSetDefinitions } from "../data/problemSetDefinitions";
import "./ProblemSetsPage.css";

function getProgress(problems) {
  if (problems.length === 0) {
    return 0;
  }

  const solvedCount = problems.filter((problem) => problem.solved).length;

  return Math.round((solvedCount / problems.length) * 100);
}

function ProblemSetsPage() {
  const [problems, setProblems] = useState([]);
  const [customProblemSets, setCustomProblemSets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function fetchProblems() {
      const [result, nextCustomProblemSets] = await Promise.all([
        getProblemCatalog(),
        getCustomProblemSets(),
      ]);

      if (ignore) {
        return;
      }

      setProblems(result);
      setCustomProblemSets(nextCustomProblemSets);
      setIsLoading(false);
    }

    fetchProblems();

    return () => {
      ignore = true;
    };
  }, []);

  const problemSets = useMemo(
    () =>
      [
        ...customProblemSets.map((problemSet) => ({
          ...problemSet,
          isCustom: true,
          problems: problems.filter((problem) =>
            problemSet.problemIds.includes(problem.id),
          ),
        })),
        ...problemSetDefinitions.map((definition) => ({
          ...definition,
          isCustom: false,
          problems: problems.filter(definition.filter),
        })),
      ].map((problemSet) => ({
        ...problemSet,
        solvedCount: problemSet.problems.filter((problem) => problem.solved).length,
        progress: getProgress(problemSet.problems),
      })),
    [customProblemSets, problems],
  );

  return (
    <main className="problem-sets-page">
      <section className="problem-sets-hero problem-sets-hero--with-action">
        <div>
          <p className="problem-sets-hero__eyebrow">Problem Sets</p>
          <h1>목표에 맞는 문제 묶음으로 이어서 풀어보세요</h1>
          <p>
            현재 문제 데이터를 기준으로 추천 문제집을 구성했습니다. 직접 문제를
            골라 내 문제집도 만들 수 있습니다.
          </p>
        </div>
        <Link to="/problem-sets/new" className="problem-sets-create-link">
          문제집 만들기
        </Link>
      </section>

      <section className="problem-sets-grid" aria-label="문제집 목록">
        {isLoading ? (
          <p className="problem-sets-empty">문제집을 불러오는 중입니다.</p>
        ) : (
          problemSets.map((problemSet) => (
            <article className="problem-set-card" key={problemSet.id}>
              <div className="problem-set-card__head">
                <div>
                  <span>{problemSet.problems.length.toLocaleString()} problems</span>
                  <h2>{problemSet.title}</h2>
                  {problemSet.isCustom && <em>내 문제집</em>}
                </div>
                <strong>{problemSet.progress}%</strong>
              </div>

              <p>{problemSet.description}</p>

              <div className="problem-set-progress" aria-hidden="true">
                <span style={{ width: `${problemSet.progress}%` }} />
              </div>

              <div className="problem-set-card__meta">
                <span>{problemSet.solvedCount}개 해결</span>
                <span>{problemSet.problems.length - problemSet.solvedCount}개 남음</span>
              </div>

              <div className="problem-set-problems">
                {problemSet.problems.slice(0, 4).map((problem) => (
                  <Link to={`/problems/${problem.id}`} key={problem.id}>
                    <span>#{problem.id}</span>
                    <strong>{problem.title}</strong>
                    <TierBadge tier={problem.tier} />
                  </Link>
                ))}
              </div>

              <Link
                to={`/problems?set=${encodeURIComponent(problemSet.id)}`}
                className="problem-set-card__action"
              >
                문제 목록에서 이어보기
              </Link>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

export default ProblemSetsPage;
