function CollapsedProblemFilter({ onExpand }) {
  return (
    <aside className="problem-filter problem-filter--collapsed" aria-label="문제 필터">
      <button
        className="problem-filter__expand"
        type="button"
        aria-label="필터 펼치기"
        onClick={onExpand}
      >
        <span aria-hidden="true">→</span>
      </button>
    </aside>
  );
}

export default CollapsedProblemFilter;
