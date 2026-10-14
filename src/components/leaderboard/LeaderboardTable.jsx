import { Link } from "react-router";
import TierBadge from "../problems/TierBadge";

function formatPercent(value) {
  return `${Number(value).toFixed(1)}%`;
}

function LeaderboardTable({ entries }) {
  return (
    <div className="leaderboard-table" role="table" aria-label="리더보드">
      <div className="leaderboard-table__row leaderboard-table__row--head" role="row">
        <span role="columnheader">순위</span>
        <span role="columnheader">유저</span>
        <span role="columnheader">티어</span>
        <span role="columnheader">정답 문제 수</span>
        <span role="columnheader">XP</span>
        <span role="columnheader">정답률</span>
        <span role="columnheader">연속 풀이</span>
      </div>

      {entries.map((entry) => (
        <Link
          to={`/users/${entry.userId}`}
          className={`leaderboard-table__row ${
            entry.isCurrentUser ? "is-current-user" : ""
          }`.trim()}
          role="row"
          key={entry.userId}
        >
          <span className="leaderboard-rank" role="cell">
            #{entry.rank}
          </span>
          <span className="leaderboard-user" role="cell">
            <strong>{entry.name}</strong>
            {entry.isCurrentUser && <small>나</small>}
          </span>
          <span role="cell">
            <TierBadge tier={entry.tier} showName />
          </span>
          <span role="cell">{entry.solvedCount.toLocaleString()}문제</span>
          <span role="cell">{entry.xp.toLocaleString()} XP</span>
          <span role="cell">{formatPercent(entry.successRate)}</span>
          <span role="cell">{entry.streak.toLocaleString()}일</span>
        </Link>
      ))}

      {entries.length === 0 && (
        <div className="leaderboard-table__empty" role="row">
          조건에 맞는 유저가 없습니다.
        </div>
      )}
    </div>
  );
}

export default LeaderboardTable;
