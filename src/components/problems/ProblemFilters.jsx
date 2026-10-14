import Button from "../common/Button";
import RangeSlider from "./RangeSlider";
import TagDropdown from "./TagDropdown";
import TierRangeSlider from "./TierRangeSlider";
import {
  AVERAGE_RANGE,
  SOLVED_RANGE,
  statusOptions,
} from "./problemListConfig";

const solvedMarkers = [
  { value: 0, label: "0" },
  { value: 250000, label: "25만" },
  { value: 500000, label: "50만" },
  { value: 750000, label: "75만" },
  { value: 1000000, label: "100만" },
];

const averageMarkers = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 4, label: "4" },
  { value: 6, label: "6" },
  { value: 8, label: "8" },
];

function ProblemFilters({
  filters,
  tagOptions,
  isSolvedOpen,
  setIsSolvedOpen,
  isAverageOpen,
  setIsAverageOpen,
  onCollapse,
  updateFilter,
  resetFilters,
}) {
  function addTag(tag) {
    if (!filters.selectedTags.includes(tag)) {
      updateFilter("selectedTags", [...filters.selectedTags, tag]);
    }
  }

  function removeTag(tag) {
    updateFilter(
      "selectedTags",
      filters.selectedTags.filter((selectedTag) => selectedTag !== tag),
    );
  }

  return (
    <aside className="problem-filter" aria-label="문제 필터">
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

      <section className="filter-section">
        <div className="filter-section__heading">
          <h3>태그</h3>
          <div className="filter-mode">
            <Button
              variant={filters.tagMode === "OR" ? "primary" : "ghost"}
              size="small"
              type="button"
              onClick={() => updateFilter("tagMode", "OR")}
            >
              OR
            </Button>
            <Button
              variant={filters.tagMode === "AND" ? "primary" : "ghost"}
              size="small"
              type="button"
              onClick={() => updateFilter("tagMode", "AND")}
            >
              AND
            </Button>
          </div>
        </div>
        <TagDropdown
          options={tagOptions}
          selectedTags={filters.selectedTags}
          onAddTag={addTag}
          onRemoveTag={removeTag}
        />
      </section>

      <section className="filter-section">
        <h3>해결 상태</h3>
        <div className="status-options">
          {statusOptions.map((statusOption) => (
            <Button
              variant={filters.status === statusOption.key ? "primary" : "pearl"}
              size="small"
              type="button"
              onClick={() => updateFilter("status", statusOption.key)}
              key={statusOption.key}
            >
              {statusOption.label}
            </Button>
          ))}
        </div>
      </section>

      <section
        className={`filter-section filter-section--collapsible ${
          isSolvedOpen ? "is-open" : ""
        }`}
      >
        <button
          className="filter-section__toggle"
          type="button"
          aria-expanded={isSolvedOpen}
          onClick={() => setIsSolvedOpen((open) => !open)}
        >
          <span>해결한 사람 수</span>
          <span aria-hidden="true">⌄</span>
        </button>
        {isSolvedOpen && (
          <RangeSlider
            label="해결한 사람 수"
            minKey="solvedMin"
            maxKey="solvedMax"
            filters={filters}
            range={SOLVED_RANGE}
            unit="명"
            markers={solvedMarkers}
            updateFilter={updateFilter}
          />
        )}
      </section>

      <section
        className={`filter-section filter-section--collapsible filter-section--average ${
          isAverageOpen ? "is-open" : ""
        }`}
      >
        <button
          className="filter-section__toggle"
          type="button"
          aria-expanded={isAverageOpen}
          onClick={() => setIsAverageOpen((open) => !open)}
        >
          <span>평균 시도 횟수</span>
          <span aria-hidden="true">⌄</span>
        </button>
        {isAverageOpen && (
          <RangeSlider
            label="평균 시도 횟수"
            minKey="averageMin"
            maxKey="averageMax"
            filters={filters}
            range={AVERAGE_RANGE}
            unit="회"
            markers={averageMarkers}
            updateFilter={updateFilter}
          />
        )}
      </section>
    </aside>
  );
}

export default ProblemFilters;
