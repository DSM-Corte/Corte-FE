import { useState } from "react";
import CollapsedProblemFilter from "../components/problems/CollapsedProblemFilter";
import ProblemFilters from "../components/problems/ProblemFilters";
import ProblemPagination from "../components/problems/ProblemPagination";
import ProblemSearchForm from "../components/problems/ProblemSearchForm";
import ProblemSort from "../components/problems/ProblemSort";
import ProblemTable from "../components/problems/ProblemTable";
import useProblemList from "../hooks/useProblemList";
import "./ProblemListPage.css";

function ProblemListPage() {
  const {
    filters,
    pagination,
    problems,
    searchInput,
    sortDirection,
    sortKey,
    tagOptions,
    resetFilters: resetProblemFilters,
    setCurrentPage,
    setSearchInput,
    submitSearch,
    updateFilter,
    updatePageSize,
    updateSort,
  } = useProblemList();
  const [isSolvedOpen, setIsSolvedOpen] = useState(true);
  const [isAverageOpen, setIsAverageOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(true);

  function resetFilters() {
    resetProblemFilters();
    setIsSolvedOpen(true);
    setIsAverageOpen(false);
  }

  return (
    <main
      className={
        isFilterOpen
          ? "problem-shell"
          : "problem-shell problem-shell--filter-collapsed"
      }
    >
      {isFilterOpen ? (
        <ProblemFilters
          filters={filters}
          tagOptions={tagOptions}
          isSolvedOpen={isSolvedOpen}
          setIsSolvedOpen={setIsSolvedOpen}
          isAverageOpen={isAverageOpen}
          setIsAverageOpen={setIsAverageOpen}
          onCollapse={() => setIsFilterOpen(false)}
          updateFilter={updateFilter}
          resetFilters={resetFilters}
        />
      ) : (
        <CollapsedProblemFilter onExpand={() => setIsFilterOpen(true)} />
      )}

      <section className="problem-content">
        <ProblemSearchForm
          value={searchInput}
          onChange={setSearchInput}
          onSubmit={submitSearch}
        />

        <p className="problem-count">
          <strong>{pagination.totalCount.toLocaleString()}</strong>문제
        </p>

        <ProblemSort
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={updateSort}
        />
        <ProblemTable problems={problems} />
        <ProblemPagination
          pagination={pagination}
          onPageChange={setCurrentPage}
          onPageSizeChange={updatePageSize}
        />
      </section>
    </main>
  );
}

export default ProblemListPage;
