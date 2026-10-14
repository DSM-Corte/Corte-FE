import { LEADERBOARD_SOLVED_RANGE } from "../../api/LeaderboardApi";
import Button from "../common/Button";
import RangeSlider from "../problems/RangeSlider";
import TierRangeSlider from "../problems/TierRangeSlider";

const solvedMarkers = [
  { value: 0, label: "0" },
  { value: 50, label: "50" },
  { value: 100, label: "100" },
  { value: 200, label: "200" },
  { value: 320, label: "320" },
];

function LeaderboardFilters({ filters, onCollapse, updateFilter, resetFilters }) {
  return (
    <aside className="problem-filter leaderboard-filter" aria-label="리더보드 필터">
      <div className="problem-filter__top">
        <h2>필터</h2>
        <div className="problem-filter__actions">
          <Button variant="ghost" size="small" type="button" onClick={resetFilters}>
            초기화
          </Button>
          <Button
            variant="pearl"
            size="small"
            type="button"
            aria-label="필터 접기"
            onClick={onCollapse}
          >
            ←
          </Button>
        </div>
      </div>

      <section className="filter-section">
        <h3>티어</h3>
        <TierRangeSlider filters={filters} updateFilter={updateFilter} />
      </section>

      <section className="filter-section filter-section--average">
        <h3>정답 문제 수</h3>
        <RangeSlider
          label="정답 문제 수"
          minKey="solvedMin"
          maxKey="solvedMax"
          filters={filters}
          range={LEADERBOARD_SOLVED_RANGE}
          unit="문제"
          markers={solvedMarkers}
          updateFilter={updateFilter}
        />
      </section>
    </aside>
  );
}

export default LeaderboardFilters;
