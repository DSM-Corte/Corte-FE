import { LEADERBOARD_PAGE_SIZE_OPTIONS } from "../../api/LeaderboardApi";

function getVisiblePages(currentPage, totalPages) {
  const pageCount = Math.min(5, totalPages);
  const startPage = Math.min(
    Math.max(currentPage - Math.floor(pageCount / 2), 1),
    Math.max(totalPages - pageCount + 1, 1),
  );

  return Array.from({ length: pageCount }, (_, index) => startPage + index);
}

function LeaderboardPagination({ pagination, onPageChange, onPageSizeChange }) {
  const visiblePages = getVisiblePages(
    pagination.currentPage,
    pagination.totalPages,
  );

  return (
    <nav className="problem-pagination" aria-label="리더보드 페이지">
      <p className="problem-pagination__summary">
        {pagination.totalCount === 0
          ? "표시할 유저가 없습니다."
          : `${pagination.startIndex.toLocaleString()}-${pagination.endIndex.toLocaleString()} / ${pagination.totalCount.toLocaleString()}명`}
      </p>

      <div className="problem-pagination__controls">
        <button
          type="button"
          className="problem-pagination__button"
          disabled={!pagination.hasPreviousPage}
          onClick={() => onPageChange(pagination.currentPage - 1)}
          aria-label="이전 페이지"
        >
          ‹
        </button>

        {visiblePages.map((page) => (
          <button
            type="button"
            className={`problem-pagination__button ${
              page === pagination.currentPage ? "is-active" : ""
            }`.trim()}
            onClick={() => onPageChange(page)}
            aria-current={page === pagination.currentPage ? "page" : undefined}
            key={page}
          >
            {page}
          </button>
        ))}

        <button
          type="button"
          className="problem-pagination__button"
          disabled={!pagination.hasNextPage}
          onClick={() => onPageChange(pagination.currentPage + 1)}
          aria-label="다음 페이지"
        >
          ›
        </button>
      </div>

      <label className="problem-pagination__size">
        <span>페이지당</span>
        <select
          className="input"
          value={pagination.pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {LEADERBOARD_PAGE_SIZE_OPTIONS.map((pageSize) => (
            <option value={pageSize} key={pageSize}>
              {pageSize}명
            </option>
          ))}
        </select>
      </label>
    </nav>
  );
}

export default LeaderboardPagination;
