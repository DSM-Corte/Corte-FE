const leaderboardSortOptions = [
  { key: "rank", label: "순위" },
  { key: "tier", label: "티어" },
  { key: "solvedCount", label: "문제 수" },
  { key: "score", label: "점수" },
  { key: "successRate", label: "정답률" },
  { key: "streak", label: "연속 풀이" },
];

function LeaderboardSort({ sortKey, sortDirection, onSort }) {
  return (
    <nav className="problem-sort" aria-label="리더보드 정렬">
      <span>정렬</span>
      {leaderboardSortOptions.map((option) => (
        <button
          type="button"
          className={sortKey === option.key ? "is-active" : ""}
          onClick={() => onSort(option.key)}
          key={option.key}
        >
          {option.label}
          {sortKey === option.key && (
            <span aria-hidden="true">
              {sortDirection === "asc" ? " ↑" : " ↓"}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}

export default LeaderboardSort;
