import { request } from "./apiClient";

const BASE = "/api/posts";
const DEFAULT_BOARD_PAGE_SIZE = 8;
const SERVER_PAGE_SIZE_MAX = 100;

// 백엔드 게시글에는 글 유형·연관 문제가 없어 모든 글이 "general"이다
export const BOARD_POST_TYPES = [
  { key: "notice", label: "공지" },
  { key: "general", label: "일반 글" },
  { key: "problem", label: "문제 글" },
];

function postPath(id) {
  return `${BASE}/${encodeURIComponent(id)}`;
}

function toPost(response) {
  return {
    id: response.id,
    title: response.title,
    markdown: response.content ?? "",
    authorName: response.author,
    // 작성자 ID는 본인 글 판별용이다. 서버가 아직 주지 않으면 undefined다
    authorId: response.authorId,
    type: "general",
    relatedProblem: undefined,
    createdAt: response.createdAt,
    updatedAt: response.updatedAt ?? response.createdAt,
  };
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function sortPosts(posts, sortKey) {
  return [...posts].sort((left, right) => {
    if (sortKey === "oldest") {
      return new Date(left.createdAt) - new Date(right.createdAt);
    }

    if (sortKey === "title") {
      return left.title.localeCompare(right.title, "ko");
    }

    return new Date(right.createdAt) - new Date(left.createdAt);
  });
}

function paginatePosts(posts, page, pageSize) {
  const normalizedPageSize = Number(pageSize) || DEFAULT_BOARD_PAGE_SIZE;
  const totalCount = posts.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / normalizedPageSize));
  const currentPage = Math.min(Math.max(Number(page) || 1, 1), totalPages);
  const startIndex = (currentPage - 1) * normalizedPageSize;
  const endIndex = Math.min(startIndex + normalizedPageSize, totalCount);

  return {
    items: posts.slice(startIndex, endIndex),
    totalCount,
    currentPage,
    pageSize: normalizedPageSize,
    totalPages,
    startIndex: totalCount === 0 ? 0 : startIndex + 1,
    endIndex,
    hasPreviousPage: currentPage > 1,
    hasNextPage: currentPage < totalPages,
  };
}

// 서버는 최신순 페이징만 지원하므로 검색·다른 정렬은 전체를 받아 화면에서 처리한다
async function getAllPosts() {
  const posts = [];
  let page = 0;
  let totalPages;

  do {
    const data = await request(`${BASE}?page=${page}&size=${SERVER_PAGE_SIZE_MAX}`);
    posts.push(...data.content.map(toPost));
    totalPages = data.totalPages;
    page += 1;
  } while (page < totalPages);

  return posts;
}

export async function createBoardPost({ title, markdown }) {
  const post = await request(BASE, {
    method: "POST",
    body: { title: String(title ?? "").trim(), content: String(markdown ?? "") },
  });

  return toPost(post);
}

export async function updateBoardPost(id, { title, markdown }) {
  const post = await request(postPath(id), {
    method: "PATCH",
    body: {
      title: title === undefined ? undefined : String(title).trim(),
      content: markdown === undefined ? undefined : String(markdown),
    },
  });

  return toPost(post);
}

export function deleteBoardPost(id) {
  return request(postPath(id), { method: "DELETE" });
}

export async function getBoardPostById(id) {
  try {
    return toPost(await request(postPath(id)));
  } catch (error) {
    if (error.status === 404) {
      return undefined;
    }

    throw error;
  }
}

export async function getBoardPostList(options = {}) {
  const {
    keyword = "",
    type = "general",
    problemId = "",
    sortKey = "latest",
    page = 1,
    pageSize = DEFAULT_BOARD_PAGE_SIZE,
  } = options;

  // 공지·문제 글과 문제별 글은 서버에 없으므로 빈 목록이다
  if ((type && type !== "general") || problemId) {
    return paginatePosts([], page, pageSize);
  }

  const normalizedKeyword = normalize(keyword);

  if (normalizedKeyword || (sortKey && sortKey !== "latest")) {
    const posts = (await getAllPosts()).filter(
      (post) =>
        !normalizedKeyword ||
        normalize(post.title).includes(normalizedKeyword) ||
        normalize(post.authorName).includes(normalizedKeyword),
    );

    return paginatePosts(sortPosts(posts, sortKey), page, pageSize);
  }

  const normalizedPageSize = Math.min(
    Number(pageSize) || DEFAULT_BOARD_PAGE_SIZE,
    SERVER_PAGE_SIZE_MAX,
  );
  const requestedPage = Math.max(Number(page) || 1, 1);
  const data = await request(
    `${BASE}?page=${requestedPage - 1}&size=${normalizedPageSize}`,
  );
  const totalPages = Math.max(1, data.totalPages);
  const startIndex = data.page * data.size + 1;

  return {
    items: data.content.map(toPost),
    totalCount: data.totalElements,
    currentPage: data.page + 1,
    pageSize: data.size,
    totalPages,
    startIndex: data.content.length === 0 ? 0 : startIndex,
    endIndex: data.content.length === 0 ? 0 : startIndex + data.content.length - 1,
    hasPreviousPage: data.page > 0,
    hasNextPage: data.page + 1 < totalPages,
  };
}
