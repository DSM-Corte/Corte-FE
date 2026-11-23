import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getMyStats } from "../api/UserApi";
import { getLanguageLabel, getVerdictLabel } from "../api/JudgeApi";

function GroupStats({ title, groups, label = (value) => value }) {
  return (
    <section className="mypage-analysis__group">
      <h3>{title}</h3>
      {groups.length === 0 ? <p>아직 기록이 없습니다.</p> : (
        <div className="mypage-analysis__table">
          <table>
            <thead><tr><th scope="col">구분</th><th scope="col">해결</th><th scope="col">제출</th><th scope="col">정답률</th></tr></thead>
            <tbody>{groups.map((group) => (
              <tr key={group.name}><th scope="row">{label(group.name)}</th>
                <td>{group.solvedCount}</td><td>{group.submissionCount}</td>
                <td><div className="mypage-analysis__rate"><meter min="0" max="100" value={group.accuracy} aria-label={`${label(group.name)} 정답률`} /><span>{group.accuracy}%</span></div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// 풀이 통계 표시. 마이페이지(내 통계)와 다른 사용자 프로필이 같이 쓴다
export function ProblemStatsView({ stats }) {
  return (
    <>
      <dl className="mypage-analysis__summary">
        <div><dt>해결한 문제</dt><dd>{stats.solvedCount.toLocaleString()}</dd></div>
        <div><dt>전체 제출</dt><dd>{stats.submissionCount.toLocaleString()}</dd></div>
        <div><dt>정답 제출</dt><dd>{stats.acceptedCount.toLocaleString()}</dd></div>
        <div><dt>정답률</dt><dd>{stats.accuracy}%</dd></div>
      </dl>
      {stats.submissionCount === 0 && <p>제출 기록이 쌓이면 풀이 분석을 확인할 수 있습니다. <Link to="/problems">문제 풀러 가기</Link></p>}
      <div className="mypage-analysis__overview">
        <section className="mypage-analysis__panel">
          <h3>풀이 정확도</h3>
          <div className="mypage-analysis__accuracy">
            <div className="mypage-analysis__ring" style={{ "--accuracy": `${Math.min(100, Math.max(0, stats.accuracy))}%` }}>
              <div><strong>{stats.accuracy}<small>%</small></strong><span>전체 정답률</span></div>
            </div>
            <ul className="mypage-analysis__verdicts">{Object.entries(stats.verdicts).map(([verdict, count]) => (
              <li key={verdict}><span><i className={verdict === "ACCEPTED" ? "is-accepted" : ""} />{getVerdictLabel(verdict)}</span><strong>{count.toLocaleString()}<small>회</small></strong></li>
            ))}</ul>
          </div>
        </section>
        <section className="mypage-analysis__panel">
          <h3>난이도별 해결</h3>
          <p className="mypage-analysis__caption">해결한 문제의 난이도 분포</p>
          <div className="mypage-analysis__bars">
            {["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "RUBY", "UNRATED"].map((tier) => {
              const count = stats.difficulties.filter((item) => item.difficulty.split("_")[0] === tier).reduce((sum, item) => sum + item.solvedCount, 0);
              return <div className="mypage-analysis__bar-row" key={tier}>
                <span>{tier[0] + tier.slice(1).toLowerCase()}</span>
                <meter min="0" max={Math.max(1, stats.solvedCount)} value={count} aria-label={`${tier} 해결한 문제`} />
                <strong>{count}<small>문제</small></strong>
              </div>;
            })}
          </div>
        </section>
      </div>
      <section className="mypage-analysis__details">
        <div className="mypage-section-heading">
          <div><h3>상세 분석</h3><p>언어와 문제 유형별로 풀이 기록을 살펴보세요.</p></div>
        </div>
        <GroupStats title="분류별 풀이" groups={stats.categories} />
        <GroupStats title="태그별 풀이" groups={stats.tags} />
        <GroupStats title="언어별 풀이" groups={stats.languages} label={getLanguageLabel} />
      </section>
      {stats.hardestProblem && <p className="mypage-analysis__hardest">
        최고 난이도 해결 문제 · <Link to={`/problems/${stats.hardestProblem.problemId}`}>{stats.hardestProblem.title}</Link>
        {" "}({stats.hardestProblem.difficulty.replaceAll("_", " ")})
      </p>}
    </>
  );
}

function MyProblemAnalysis() {
  const [result, setResult] = useState({ loading: true });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let ignore = false;
    getMyStats().then(
      (stats) => { if (!ignore) setResult({ stats }); },
      (error) => { if (!ignore) setResult({ error: error.message }); },
    );
    return () => { ignore = true; };
  }, [retry]);

  return (
    <article className="mypage-grass-card mypage-analysis">
      <div className="mypage-section-heading"><h2>문제 분석</h2></div>
      {result.loading ? <p role="status">풀이 통계를 불러오는 중입니다.</p> : result.error ? (
        <div role="alert">
          <p>풀이 통계를 불러오지 못했습니다. {result.error}</p>
          <button type="button" onClick={() => { setResult({ loading: true }); setRetry(retry + 1); }}>다시 불러오기</button>
        </div>
      ) : (
        <ProblemStatsView stats={result.stats} />
      )}
    </article>
  );
}

export default MyProblemAnalysis;
