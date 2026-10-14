import TierBadge from "./TierBadge";

function ProblemTable({ problems }) {
  return (
    <div className="problem-table" role="table" aria-label="문제 목록">
      <div className="problem-table__row problem-table__row--head" role="row">
        <span role="columnheader">#</span>
        <span role="columnheader">제목</span>
        <span role="columnheader">태그</span>
        <span role="columnheader">푼 사람 수</span>
        <span role="columnheader">평균 시도</span>
        <span role="columnheader">해결</span>
      </div>

      {problems.map((problem) => (
        <a
          href={`/problems/${problem.id}`}
          className="problem-table__row"
          role="row"
          key={problem.id}
        >
          <span className="problem-number" role="cell">
            <TierBadge tier={problem.tier} />
            {problem.id}
          </span>
          <span className="problem-title" role="cell">
            {problem.title}
          </span>
          <span className="problem-tags" role="cell">
            {problem.tags.slice(0, 2).join(", ")}
          </span>
          <span role="cell">{problem.solvedCount.toLocaleString()}</span>
          <span role="cell">{problem.averageTries.toFixed(2)}</span>
          <span className="problem-status" role="cell">
            {problem.solved && (
              <span className="problem-status__check" aria-label="해결 완료">
                ✓
              </span>
            )}
          </span>
        </a>
      ))}

      {problems.length === 0 && (
        <div className="problem-table__empty" role="row">
          조건에 맞는 문제가 없습니다.
        </div>
      )}
    </div>
  );
}

export default ProblemTable;
