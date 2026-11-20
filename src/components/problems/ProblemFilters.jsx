import Button from "../common/Button";
import TagDropdown from "./TagDropdown";
import { isAuthenticated } from "../../api/AuthApi";
import { difficultyTierOptions, statusOptions } from "./problemListConfig";

function ProblemFilters({
  filters,
  tagOptions,
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
        <label htmlFor="problem-difficulty-tier">난이도</label>
        <select
          id="problem-difficulty-tier"
          className="problem-difficulty-select"
          value={filters.difficultyTier}
          onChange={(event) => updateFilter("difficultyTier", event.target.value)}
        >
          {difficultyTierOptions.map((option) => (
            <option key={option.key} value={option.key}>{option.label}</option>
          ))}
        </select>
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
        <h3>내 해결 상태</h3>
        {!isAuthenticated() && <p>로그인하면 내 해결 상태로 필터링할 수 있어요.</p>}
        <div className="status-options">
          {statusOptions.map((statusOption) => (
            <Button
              variant={filters.status === statusOption.key ? "primary" : "pearl"}
              size="small"
              type="button"
              onClick={() => updateFilter("status", statusOption.key)}
              key={statusOption.key}
              aria-pressed={filters.status === statusOption.key}
              disabled={statusOption.key !== "all" && !isAuthenticated()}
            >
              {statusOption.label}
            </Button>
          ))}
        </div>
      </section>

    </aside>
  );
}

export default ProblemFilters;
