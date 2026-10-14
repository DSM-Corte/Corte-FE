import { getCurrentUser } from "./AuthApi";
import { mockProblems } from "../data/mockProblem";
import { archivedSeedPosts, archivedSeedPostIds } from "../data/archivedSeedPosts";

const BOARD_STORAGE_KEY = "cotre_mock_board_posts_v2";
const DEFAULT_BOARD_PAGE_SIZE = 8;

export const BOARD_POST_TYPES = [
  { key: "notice", label: "공지" },
  { key: "general", label: "일반 글" },
  { key: "problem", label: "문제 글" },
];

const seedPosts = [
  {
    id: "post-seed-community-guide",
    title: "COTRE 커뮤니티 이용 안내",
    markdown:
      "문제 풀이 과정, 막혔던 부분, 코드 리뷰 기록을 자유롭게 남길 수 있습니다. 직접 작성한 게시글은 이 목록에 바로 추가됩니다.",
    authorId: "user-seed-cotre",
    authorName: "cotre",
    type: "notice",
    relatedProblemId: "",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  },
];

function delay(ms = 150) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function getStoredPosts() {
  const rawPosts = window.localStorage.getItem(BOARD_STORAGE_KEY);

  if (!rawPosts) {
    return seedPosts;
  }

  try {
    const storedPosts = JSON.parse(rawPosts);
    const seedPostMap = new Map(seedPosts.map((post) => [post.id, post]));
    const normalizedStoredPosts = storedPosts
      .filter((post) => !archivedSeedPostIds.has(post.id) || seedPostMap.has(post.id))
      .map((post) => seedPostMap.get(post.id) ?? post);
    const storedPostIds = new Set(normalizedStoredPosts.map((post) => post.id));
    const missingSeedPosts = seedPosts.filter((post) => !storedPostIds.has(post.id));

    return [...normalizedStoredPosts, ...missingSeedPosts];
  } catch {
    window.localStorage.removeItem(BOARD_STORAGE_KEY);
    return seedPosts;
  }
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getRelatedProblem(problemId) {
  const normalizedProblemId = Number(problemId);

  if (!normalizedProblemId) {
    return undefined;
  }

  return mockProblems.find((problem) => problem.id === normalizedProblemId);
}

function enrichPost(post) {
  const normalizedType = post.type ?? "general";
  const relatedProblem =
    normalizedType === "problem" ? getRelatedProblem(post.relatedProblemId) : undefined;

  return {
    ...post,
    type: normalizedType,
    relatedProblem: relatedProblem
      ? {
          id: relatedProblem.id,
          title: relatedProblem.title,
          tier: relatedProblem.tier,
        }
      : undefined,
  };
}

function matchesType(post, type) {
  if (!type) {
    return true;
  }

  return (post.type ?? "general") === type;
}

function matchesProblem(post, problemId) {
  if (!problemId) {
    return true;
  }

  const normalizedProblemId = Number(problemId);

  if (!Number.isFinite(normalizedProblemId)) {
    return false;
  }

  return post.type === "problem" && Number(post.relatedProblemId) === normalizedProblemId;
}

function matchesKeyword(post, keyword) {
  const normalizedKeyword = normalize(keyword);

  if (!normalizedKeyword) {
    return true;
  }

  return (
    normalize(post.title).includes(normalizedKeyword) ||
    normalize(post.authorName).includes(normalizedKeyword) ||
    (post.type === "problem" &&
      normalize(post.relatedProblem?.title).includes(normalizedKeyword)) ||
    String(post.relatedProblem?.id ?? "").includes(normalizedKeyword)
  );
}

function sortPosts(posts, sortKey) {
  return [...posts].sort((left, right) => {
    if (sortKey === "oldest") {
      return new Date(left.createdAt) - new Date(right.createdAt);
    }

    if (sortKey === "title") {
      return left.title.localeCompare(right.title, "ko");
    }

    if (sortKey === "problem") {
      return (left.relatedProblem?.title ?? "zzz").localeCompare(
        right.relatedProblem?.title ?? "zzz",
        "ko",
      );
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

function savePosts(posts) {
  window.localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(posts));
}

function createBoardError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export async function createBoardPost({
  title,
  markdown,
  relatedProblemId = "",
  type = "general",
}) {
  await delay();

  const trimmedTitle = String(title ?? "").trim();
  const content = String(markdown ?? "");

  if (!trimmedTitle) {
    throw createBoardError("제목을 입력해주세요.", "EMPTY_TITLE");
  }

  if (!content.trim()) {
    throw createBoardError("본문을 입력해주세요.", "EMPTY_CONTENT");
  }

  const user = await getCurrentUser();

  if (!user) {
    throw createBoardError("로그인 후 게시글을 작성할 수 있습니다.", "AUTH_REQUIRED");
  }

  const normalizedType = BOARD_POST_TYPES.some((postType) => postType.key === type)
    ? type
    : "general";
  const post = {
    id: `post-${Date.now()}`,
    title: trimmedTitle,
    markdown: content,
    authorId: user.id,
    authorName: user.name,
    type: normalizedType,
    relatedProblemId:
      normalizedType === "problem" && relatedProblemId
        ? Number(relatedProblemId)
        : "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  savePosts([post, ...getStoredPosts()]);

  return enrichPost(post);
}

export async function updateBoardPost(id, { title, markdown, relatedProblemId, type }) {
  await delay();

  const posts = getStoredPosts();
  const targetPost = posts.find((post) => post.id === id);

  if (!targetPost) {
    throw createBoardError("게시글을 찾을 수 없습니다.", "POST_NOT_FOUND");
  }

  const nextPost = {
    ...targetPost,
    title: title === undefined ? targetPost.title : String(title).trim(),
    markdown: markdown === undefined ? targetPost.markdown : String(markdown),
    type:
      type === undefined || !BOARD_POST_TYPES.some((postType) => postType.key === type)
        ? targetPost.type
        : type,
    updatedAt: new Date().toISOString(),
  };

  nextPost.relatedProblemId =
    nextPost.type === "problem"
      ? relatedProblemId === undefined
        ? targetPost.relatedProblemId
        : relatedProblemId
          ? Number(relatedProblemId)
          : ""
      : "";

  if (!nextPost.title) {
    throw createBoardError("제목을 입력해주세요.", "EMPTY_TITLE");
  }

  if (!nextPost.markdown.trim()) {
    throw createBoardError("본문을 입력해주세요.", "EMPTY_CONTENT");
  }

  savePosts(posts.map((post) => (post.id === id ? nextPost : post)));

  return enrichPost(nextPost);
}

export async function getBoardPosts() {
  await delay(100);
  return getStoredPosts().map(enrichPost);
}

export async function getBoardPostById(id) {
  await delay(100);

  const post = getStoredPosts().find((item) => item.id === id);

  return post ? enrichPost(post) : undefined;
}

export async function getBoardPostList(options = {}) {
  await delay(100);

  const {
    keyword = "",
    type = "general",
    problemId = "",
    sortKey = "latest",
    page = 1,
    pageSize = DEFAULT_BOARD_PAGE_SIZE,
  } = options;

  const posts = getStoredPosts().map(enrichPost);
  const filteredPosts = posts.filter(
    (post) =>
      matchesType(post, type) &&
      matchesProblem(post, problemId) &&
      matchesKeyword(post, keyword),
  );
  const sortedPosts = sortPosts(filteredPosts, sortKey);

  return paginatePosts(sortedPosts, page, pageSize);
}
