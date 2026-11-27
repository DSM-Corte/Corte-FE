import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { getCurrentUserId } from "../api/AuthApi";
import {
  BOARD_POST_TYPES,
  deleteBoardPost,
  getBoardPostById,
} from "../api/BoardApi";
import CodeRunModal from "../components/community/CodeRunModal";
import MarkdownPreview from "../components/community/MarkdownPreview";
import "./CommunityPostDetailPage.css";
import "./CommunityWritePage.css";

function formatPostDate(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getPostTypeLabel(type) {
  return BOARD_POST_TYPES.find((postType) => postType.key === type)?.label ?? "일반 글";
}

function CommunityPostDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [activeSnippet, setActiveSnippet] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function fetchPost() {
      setIsLoading(true);
      setHasError(false);

      try {
        const nextPost = await getBoardPostById(id);

        if (!ignore) {
          setPost(nextPost ?? null);
        }
      } catch {
        if (!ignore) {
          setPost(null);
          setHasError(true);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    fetchPost();

    return () => {
      ignore = true;
    };
  }, [id]);

  async function handleDelete() {
    if (isDeleting || !window.confirm("이 게시글을 삭제할까요? 삭제하면 되돌릴 수 없습니다.")) {
      return;
    }

    setIsDeleting(true);
    setActionMessage("");

    try {
      await deleteBoardPost(id);
      navigate("/community", { replace: true });
    } catch (error) {
      if (error.code === "B001") {
        // 이미 삭제된 글이라 목록으로 돌아간다
        navigate("/community", { replace: true });
        return;
      }

      setActionMessage(
        error.code === "B002"
          ? "게시글 작성자만 삭제할 수 있습니다."
          : error.message,
      );
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return <main className="community-post-state">게시글을 불러오는 중입니다.</main>;
  }

  if (!post) {
    return (
      <main className="community-post-state">
        <p>
          {hasError
            ? "게시글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
            : "게시글을 찾을 수 없습니다."}
        </p>
        <Link to="/community">커뮤니티로 돌아가기</Link>
      </main>
    );
  }

  // 서버가 작성자 ID를 주기 전에는 undefined라 버튼을 숨긴다. 실제 권한은 서버가 검사한다
  const isAuthor =
    post.authorId !== undefined &&
    String(post.authorId) === String(getCurrentUserId());

  return (
    <main className="community-post-page">
      <section className="community-post-hero">
        <Link to="/community" className="community-post-back">
          커뮤니티로 돌아가기
        </Link>

        <div className="community-post-type">{getPostTypeLabel(post.type)}</div>
        <h1>{post.title}</h1>

        <div className="community-post-meta">
          <span>{post.authorName}</span>
          <span>{formatPostDate(post.createdAt)}</span>
          {post.relatedProblem && (
            <Link
              to={`/problems/${post.relatedProblem.id}`}
              className="community-post-problem"
            >
              #{post.relatedProblem.id} {post.relatedProblem.title}
            </Link>
          )}
        </div>

        {isAuthor && (
          <div className="community-post-actions">
            <Link to={`/community/posts/${post.id}/edit`}>수정</Link>
            <button type="button" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "삭제 중..." : "삭제"}
            </button>
          </div>
        )}
        {actionMessage && (
          <p className="community-post-action-message" role="alert">
            {actionMessage}
          </p>
        )}
      </section>

      <section className="community-post-body">
        <article className="community-post-content">
          <MarkdownPreview
            markdown={post.markdown}
            onRunSnippet={setActiveSnippet}
          />
        </article>
      </section>

      {activeSnippet && (
        <CodeRunModal
          snippet={activeSnippet}
          onClose={() => setActiveSnippet(null)}
        />
      )}
    </main>
  );
}

export default CommunityPostDetailPage;
