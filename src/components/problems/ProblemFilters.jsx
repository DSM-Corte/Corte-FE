import Button from "../common/Button";
import TagDropdown from "./TagDropdown";
import TierRangeSlider from "./TierRangeSlider";
import { statusOptions } from "./problemListConfig";

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

    </aside>
  );
}

export default ProblemFilters;
