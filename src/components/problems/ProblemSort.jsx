import { sortOptions } from "./problemListConfig";

function ProblemSort({ sortKey, sortDirection, onSort }) {
  return (
    <nav className="problem-sort" aria-label="정렬">
      <span>정렬</span>
      {sortOptions.map((option) => (
        <button
          type="button"
          className={sortKey === option.key ? "is-active" : ""}
          onClick={() => onSort(option.key)}
          key={option.key}
        >
          {option.label}
          {sortKey === option.key && option.key !== "random" && (
            <span aria-hidden="true">
              {sortDirection === "asc" ? " ↑" : " ↓"}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}

export default ProblemSort;
