import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { BOARD_POST_TYPES, getBoardPostList } from "../api/BoardApi";
import "./CommunityListPage.css";

const sortOptions = [
  { key: "latest", label: "최신순" },
  { key: "oldest", label: "오래된순" },
  { key: "title", label: "제목순" },
];

const problemSortOption = { key: "problem", label: "관련 문제순" };

function formatPostDate(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getVisiblePages(currentPage, totalPages) {
  const pageCount = Math.min(5, totalPages);
  const startPage = Math.min(
    Math.max(currentPage - Math.floor(pageCount / 2), 1),
    Math.max(totalPages - pageCount + 1, 1),
  );

  return Array.from({ length: pageCount }, (_, index) => startPage + index);
}

function CommunityListPage() {
  const [searchParams] = useSearchParams();
  const linkedProblemId = searchParams.get("problemId") ?? "";
  const hasProblemFilter = Boolean(linkedProblemId);
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [postType, setPostType] = useState("general");
  const [sortKey, setSortKey] = useState("latest");
  const [pagination, setPagination] = useState({
    items: [],
    totalCount: 0,
    currentPage: 1,
    pageSize: 8,
    totalPages: 1,
    startIndex: 0,
    endIndex: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const visiblePages = useMemo(
    () => getVisiblePages(pagination.currentPage, pagination.totalPages),
    [pagination.currentPage, pagination.totalPages],
  );
  const effectivePostType = hasProblemFilter ? "problem" : postType;
  const isProblemPostType = effectivePostType === "problem";
  const currentSortOptions = isProblemPostType
    ? [...sortOptions, problemSortOption]
    : sortOptions;

  useEffect(() => {
    let ignore = false;

    async function fetchPosts() {
      setIsLoading(true);

      const nextPagination = await getBoardPostList({
        keyword,
        type: effectivePostType,
        problemId: linkedProblemId,
        sortKey,
        page: pagination.currentPage,
        pageSize: pagination.pageSize,
      });

      if (!ignore) {
        setPagination(nextPagination);
        setIsLoading(false);
      }
    }

    fetchPosts();

    return () => {
      ignore = true;
    };
  }, [
    keyword,
    effectivePostType,
    linkedProblemId,
    sortKey,
    pagination.currentPage,
    pagination.pageSize,
  ]);

  function handleSearchSubmit(event) {
    event.preventDefault();
    setKeyword(keywordInput);
    setPagination((currentPagination) => ({
      ...currentPagination,
      currentPage: 1,
    }));
  }

  function handleTypeChange(nextType) {
    if (hasProblemFilter) {
      return;
    }

    setPostType(nextType);
    setSortKey((currentSortKey) =>
      nextType === "problem" || currentSortKey !== "problem" ? currentSortKey : "latest",
    );
    setPagination((currentPagination) => ({
      ...currentPagination,
      currentPage: 1,
    }));
  }

  function handleSortChange(event) {
    setSortKey(event.target.value);
    setPagination((currentPagination) => ({
      ...currentPagination,
      currentPage: 1,
    }));
  }

  function handlePageChange(nextPage) {
    setPagination((currentPagination) => ({
      ...currentPagination,
      currentPage: nextPage,
    }));
  }

  return (
    <main className="community-list-page">
      <section className="community-list-hero">
        <div>
          <p className="community-list-hero__eyebrow">Community</p>
          <h1>커뮤니티</h1>
          <p>
            풀이 기록과 코드 리뷰 과정을 공유하고, 관련 문제를 기준으로 글을
            찾아볼 수 있습니다.
          </p>
        </div>

        <Link to="/community/write" className="community-write-link">
          글쓰기
        </Link>
      </section>

      <section className="community-list-shell">
        <div className="community-list-controls">
          <form className="community-search" onSubmit={handleSearchSubmit}>
            <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" />
              <path d="m16 16 4 4" />
            </svg>
            <input
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              placeholder={
                hasProblemFilter
                  ? "이 문제의 게시글 검색..."
                  : isProblemPostType
                  ? "게시글, 작성자, 문제 검색..."
                  : "게시글 또는 작성자 검색..."
              }
            />
            <button type="submit">검색</button>
          </form>

          <label className="community-sort">
            <span>정렬</span>
            <span className="community-sort__select">
              <select value={sortKey} onChange={handleSortChange}>
                {currentSortOptions.map((option) => (
                  <option value={option.key} key={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
              <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                <path d="m7 10 5 5 5-5" />
              </svg>
            </span>
          </label>
        </div>

        {hasProblemFilter ? (
          <div className="community-filter-context">
            <div>
              <span>문제 글</span>
              <strong>#{linkedProblemId} 관련 게시글</strong>
            </div>
            <Link to="/community">전체 커뮤니티 보기</Link>
          </div>
        ) : (
          <div className="community-type-tabs" role="tablist" aria-label="글 종류">
            {BOARD_POST_TYPES.map((type) => (
              <button
                type="button"
                className={type.key === postType ? "is-active" : ""}
                role="tab"
                aria-selected={type.key === postType}
                onClick={() => handleTypeChange(type.key)}
                key={type.key}
              >
                {type.label}
              </button>
            ))}
          </div>
        )}

        <section
          className={`community-table ${
            isProblemPostType ? "community-table--problem" : ""
          }`.trim()}
          aria-label="커뮤니티 글 목록"
        >
          <div className="community-table__row community-table__row--head">
            <span>No.</span>
            <span>제목</span>
            <span>작성자</span>
            <span>일시</span>
            {isProblemPostType && <span>관련 문제</span>}
          </div>

          {isLoading ? (
            <div className="community-table__empty">게시글을 불러오는 중입니다.</div>
          ) : pagination.items.length === 0 ? (
            <div className="community-table__empty">표시할 게시글이 없습니다.</div>
          ) : (
            pagination.items.map((post, index) => (
              <Link
                to={`/community/posts/${post.id}`}
                className="community-table__row community-table__row--link"
                key={post.id}
              >
                <span className="community-table__number">
                  {pagination.totalCount -
                    ((pagination.currentPage - 1) * pagination.pageSize + index)}
                </span>
                <span className="community-table__title">
                  <strong>{post.title}</strong>
                  <small>
                    {post.markdown.replace(/\s+/g, " ").trim().slice(0, 74)}
                  </small>
                </span>
                <span className="community-table__author">{post.authorName}</span>
                <span className="community-table__date">
                  {formatPostDate(post.createdAt)}
                </span>
                {isProblemPostType && (
                  <span className="community-table__problem">
                    {post.relatedProblem ? (
                      <>
                        <strong>{post.relatedProblem.title}</strong>
                        <small>#{post.relatedProblem.id}</small>
                      </>
                    ) : (
                      <em>등록 안함</em>
                    )}
                  </span>
                )}
              </Link>
            ))
          )}
        </section>

        <nav className="community-pagination" aria-label="커뮤니티 페이지">
          <p>
            {pagination.totalCount === 0
              ? "게시글 없음"
              : `${pagination.startIndex}-${pagination.endIndex} / ${pagination.totalCount}`}
          </p>

          <div className="community-pagination__controls">
            <button
              type="button"
              disabled={!pagination.hasPreviousPage}
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              aria-label="이전 페이지"
            >
              ‹
            </button>

            {visiblePages.map((page) => (
              <button
                type="button"
                className={page === pagination.currentPage ? "is-active" : ""}
                onClick={() => handlePageChange(page)}
                aria-current={page === pagination.currentPage ? "page" : undefined}
                key={page}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              disabled={!pagination.hasNextPage}
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              aria-label="다음 페이지"
            >
              ›
            </button>
          </div>
        </nav>
      </section>
    </main>
  );
}

export default CommunityListPage;
