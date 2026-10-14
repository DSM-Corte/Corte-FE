import { useEffect, useState } from "react";
import {
  createDefaultLeaderboardFilters,
  DEFAULT_LEADERBOARD_PAGE_SIZE,
  getLeaderboard,
} from "../api/LeaderboardApi";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import LeaderboardFilters from "../components/leaderboard/LeaderboardFilters";
import LeaderboardPagination from "../components/leaderboard/LeaderboardPagination";
import LeaderboardSort from "../components/leaderboard/LeaderboardSort";
import LeaderboardTable from "../components/leaderboard/LeaderboardTable";
import "./ProblemListPage.css";
import "./LeaderboardPage.css";

function LeaderboardPage() {
  const [filters, setFilters] = useState(() => createDefaultLeaderboardFilters());
  const [searchInput, setSearchInput] = useState("");
  const [sortKey, setSortKey] = useState("rank");
  const [sortDirection, setSortDirection] = useState("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_LEADERBOARD_PAGE_SIZE);
  const [pagination, setPagination] = useState({
    items: [],
    totalCount: 0,
    currentPage: 1,
    pageSize: DEFAULT_LEADERBOARD_PAGE_SIZE,
    totalPages: 1,
    startIndex: 0,
    endIndex: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function fetchLeaderboard() {
      setIsLoading(true);
      const nextPagination = await getLeaderboard({
        ...filters,
        sortKey,
        sortDirection,
        page,
        pageSize,
      });

      if (ignore) {
        return;
      }

      setPagination(nextPagination);
      setIsLoading(false);
    }

    fetchLeaderboard();

    return () => {
      ignore = true;
    };
  }, [filters, page, pageSize, sortDirection, sortKey]);

  function updateFilter(key, value) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
    setPage(1);
  }

  function resetFilters() {
    setFilters(createDefaultLeaderboardFilters());
    setSearchInput("");
    setPage(1);
  }

  function submitSearch(event) {
    event.preventDefault();
    updateFilter("keyword", searchInput);
  }

  function updateSort(nextSortKey) {
    setPage(1);

    if (nextSortKey === sortKey) {
      setSortDirection((currentDirection) =>
        currentDirection === "asc" ? "desc" : "asc",
      );
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection(nextSortKey === "rank" ? "asc" : "desc");
  }

  function updatePageSize(nextPageSize) {
    setPageSize(nextPageSize);
    setPage(1);
  }

  return (
    <main
      className={
        isFilterOpen
          ? "problem-shell leaderboard-shell"
          : "problem-shell problem-shell--filter-collapsed leaderboard-shell"
      }
    >
      {isFilterOpen ? (
        <LeaderboardFilters
          filters={filters}
          onCollapse={() => setIsFilterOpen(false)}
          updateFilter={updateFilter}
          resetFilters={resetFilters}
        />
      ) : (
        <aside
          className="problem-filter problem-filter--collapsed"
          aria-label="리더보드 필터 열기"
        >
          <button
            type="button"
            className="problem-filter__expand"
            aria-label="필터 펼치기"
            onClick={() => setIsFilterOpen(true)}
          >
            <span aria-hidden="true">→</span>
          </button>
        </aside>
      )}

      <section className="problem-content leaderboard-content">
        <div className="leaderboard-header">
          <p className="leaderboard-header__eyebrow">Leaderboard</p>
          <h1>리더보드</h1>
          <p>
            정답 문제 수와 XP를 기준으로 유저 순위를 확인하고, 티어와 문제 수로
            필요한 구간만 빠르게 좁혀볼 수 있습니다.
          </p>
        </div>

        <form className="problem-search leaderboard-search" role="search" onSubmit={submitSearch}>
          <span aria-hidden="true">검색</span>
          <Input
            className="problem-search__input"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            aria-label="리더보드 검색"
            placeholder="닉네임 또는 티어를 검색하세요"
          />
          <Button variant="primary" size="medium" type="submit">
            검색
          </Button>
        </form>

        <div className="leaderboard-count-row">
          <p className="problem-count">
            <strong>{pagination.totalCount.toLocaleString()}</strong>명
          </p>
          {isLoading && <span className="leaderboard-loading">불러오는 중</span>}
        </div>

        <LeaderboardSort
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={updateSort}
        />
        <LeaderboardTable entries={pagination.items} />
        <LeaderboardPagination
          pagination={pagination}
          onPageChange={setPage}
          onPageSizeChange={updatePageSize}
        />
      </section>
    </main>
  );
}

export default LeaderboardPage;
