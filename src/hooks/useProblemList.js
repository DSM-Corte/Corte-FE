import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import {
  DEFAULT_PROBLEM_PAGE_SIZE,
  getProblemList,
  getProblemTags,
} from "../api/ProblemApi";
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
  const [tagOptions, setTagOptions] = useState([]);
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
    async function fetchTags() {
      setTagOptions(await getProblemTags());
    }

    fetchTags();
  }, []);

  useEffect(() => {
    async function fetchProblems() {
      const data = await getProblemList({
        ...filters,
        sortKey,
        sortDirection,
        randomSortSeed,
        page: currentPage,
        pageSize,
      });

      setProblems(data.items);
      setPagination(data);
    }

    fetchProblems();
  }, [filters, sortKey, sortDirection, randomSortSeed, currentPage, pageSize]);

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
    tagOptions,
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
