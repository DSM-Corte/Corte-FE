import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { getWorkbookCatalogWithProgress } from "../api/ProblemSetApi";
import {
  DEFAULT_PROBLEM_PAGE_SIZE,
  getProblemList,
} from "../api/ProblemApi";
import {
  createDefaultFilters,
  difficultyTierOptions,
  problemSortKeys,
} from "../components/problems/problemListConfig";

function getTagsFromSearchParams(searchParams) {
  return searchParams
    .getAll("tag")
    .flatMap((tag) => tag.split(","))
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function createInitialFilters(searchParams) {
  const nextFilters = createDefaultFilters();

  const difficultyTier = searchParams.get("difficultyTier") ?? searchParams.get("tier")?.split(" ")[0].toUpperCase() ?? "";
  nextFilters.difficultyTier = difficultyTierOptions.some((option) => option.key === difficultyTier) ? difficultyTier : "";
  nextFilters.keyword = searchParams.get("keyword") ?? "";
  nextFilters.problemSetId = searchParams.get("set") ?? "";
  nextFilters.selectedTags = getTagsFromSearchParams(searchParams);

  return nextFilters;
}

function getSortKeyFromSearchParams(searchParams) {
  const sortKey = searchParams.get("sort");
  return problemSortKeys.includes(sortKey) ? sortKey : "id";
}

function getSortDirectionFromSearchParams(searchParams) {
  return searchParams.get("direction") === "asc" ? "asc" : "desc";
}

function createEmptyPagination() {
  return {
    items: [],
    totalCount: 0,
    currentPage: 1,
    pageSize: DEFAULT_PROBLEM_PAGE_SIZE,
    totalPages: 1,
    startIndex: 0,
    endIndex: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  };
}

function useProblemList() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [problems, setProblems] = useState([]);
  const [pagination, setPagination] = useState(createEmptyPagination());
  const [catalog, setCatalog] = useState(null);
  const [filters, setFilters] = useState(() => createInitialFilters(searchParams));
  const [searchInput, setSearchInput] = useState(searchParams.get("keyword") ?? "");
  const [sortKey, setSortKey] = useState(() => getSortKeyFromSearchParams(searchParams));
  const [sortDirection, setSortDirection] = useState(() =>
    getSortDirectionFromSearchParams(searchParams),
  );
  const [randomSortSeed, setRandomSortSeed] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PROBLEM_PAGE_SIZE);

  useEffect(() => {
    let ignore = false;
    getWorkbookCatalogWithProgress()
      .then((problems) => { if (!ignore) setCatalog(problems); })
      .catch((error) => { if (!ignore) { setError(error.message); setLoading(false); } });
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    if (!catalog) return;
    let ignore = false;

    async function fetchProblems() {
      setLoading(true);
      try {
        const data = await getProblemList({
          ...filters,
          useServerCatalog: true,
          serverCatalog: catalog,
          sortKey,
          sortDirection,
          randomSortSeed,
          page: currentPage,
          pageSize,
        });
        if (!ignore) {
          setProblems(data.items);
          setPagination(data);
          setError("");
        }
      } catch (error) {
        if (!ignore) setError(error.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchProblems();
    return () => { ignore = true; };
  }, [catalog, filters, sortKey, sortDirection, randomSortSeed, currentPage, pageSize]);

  function updateFilter(key, value) {
    setCurrentPage(1);
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function submitSearch(event) {
    event.preventDefault();
    updateFilter("keyword", searchInput);
  }

  function updateSort(nextSortKey) {
    setCurrentPage(1);

    if (nextSortKey === "random") {
      setSortKey("random");
      setSortDirection("asc");
      setRandomSortSeed((seed) => seed + 1);
      return;
    }

    if (sortKey === nextSortKey) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection("asc");
  }

  function resetFilters() {
    setFilters(createDefaultFilters());
    setSearchInput("");
    setSortKey("id");
    setSortDirection("desc");
    setRandomSortSeed(0);
    setCurrentPage(1);
    setPageSize(DEFAULT_PROBLEM_PAGE_SIZE);
  }

  function updatePageSize(nextPageSize) {
    setPageSize(nextPageSize);
    setCurrentPage(1);
  }

  return {
    error,
    loading,
    filters,
    pagination,
    problems,
    searchInput,
    sortDirection,
    sortKey,
    tagOptions: [...new Set(catalog?.flatMap((problem) => problem.tags))].sort(),
    resetFilters,
    setCurrentPage,
    setSearchInput,
    submitSearch,
    updateFilter,
    updatePageSize,
    updateSort,
  };
}

export default useProblemList;
