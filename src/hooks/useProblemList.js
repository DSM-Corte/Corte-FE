import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import {
  DEFAULT_PROBLEM_PAGE_SIZE,
  getProblemList,
} from "../api/ProblemApi";
import { applyLocalProblemProgress, fetchProblemCatalog } from "../api/ProblemReadApi";
import {
  createDefaultFilters,
  getTierRankIndex,
  problemSortKeys,
  tierRankOptions,
} from "../components/problems/problemListConfig";

function getTagsFromSearchParams(searchParams) {
  return searchParams
    .getAll("tag")
    .flatMap((tag) => tag.split(","))
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getTierIndexFromSearchParams(searchParams) {
  const tier = searchParams.get("tier");

  if (!tier || !tierRankOptions.includes(tier)) {
    return null;
  }

  return getTierRankIndex(tier);
}

function createInitialFilters(searchParams) {
  const nextFilters = createDefaultFilters();
  const tierIndex = getTierIndexFromSearchParams(searchParams);

  nextFilters.keyword = searchParams.get("keyword") ?? "";
  nextFilters.problemSetId = searchParams.get("set") ?? "";
  nextFilters.selectedTags = getTagsFromSearchParams(searchParams);

  if (tierIndex !== null) {
    nextFilters.tierMinIndex = String(tierIndex);
    nextFilters.tierMaxIndex = String(tierIndex);
  }

  return nextFilters;
}

function getSortKeyFromSearchParams(searchParams) {
  const sortKey = searchParams.get("sort");
  return problemSortKeys.includes(sortKey) ? sortKey : "id";
}

function getSortDirectionFromSearchParams(searchParams) {
  return searchParams.get("direction") === "desc" ? "desc" : "asc";
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
  const [problems, setProblems] = useState([]);
  const [pagination, setPagination] = useState(createEmptyPagination());
  const [catalog, setCatalog] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
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
    const controller = new AbortController();

    async function loadCatalog() {
      try {
        const problems = await fetchProblemCatalog(controller.signal);
        const catalog = await applyLocalProblemProgress(problems);
        if (!controller.signal.aborted) setCatalog(catalog);
      } catch {
        if (!controller.signal.aborted) {
          setError("문제 목록을 불러오지 못했습니다.");
          setIsLoading(false);
        }
      }
    }

    loadCatalog();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!catalog) return;
    let active = true;

    async function fetchProblems() {
      try {
        const data = await getProblemList({
          ...filters,
          solvedMin: "",
          solvedMax: "",
          averageMin: "",
          averageMax: "",
          sortKey,
          sortDirection,
          randomSortSeed,
          page: currentPage,
          pageSize,
        }, catalog);

        if (active) {
          setProblems(data.items);
          setPagination(data);
          setError("");
        }
      } catch {
        if (active) setError("문제 목록을 표시하지 못했습니다.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    fetchProblems();
    return () => { active = false; };
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
    setSortDirection("asc");
    setRandomSortSeed(0);
    setCurrentPage(1);
    setPageSize(DEFAULT_PROBLEM_PAGE_SIZE);
  }

  function updatePageSize(nextPageSize) {
    setPageSize(nextPageSize);
    setCurrentPage(1);
  }

  return {
    filters,
    pagination,
    problems,
    searchInput,
    sortDirection,
    sortKey,
    tagOptions: [...new Set(catalog?.flatMap((problem) => problem.tags))].sort(),
    isLoading,
    error,
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
