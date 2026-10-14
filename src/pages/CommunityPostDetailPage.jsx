import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { BOARD_POST_TYPES, getBoardPostById } from "../api/BoardApi";
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
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSnippet, setActiveSnippet] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function fetchPost() {
      setIsLoading(true);
      const nextPost = await getBoardPostById(id);

      if (!ignore) {
        setPost(nextPost ?? null);
        setIsLoading(false);
      }
    }

    fetchPost();

    return () => {
      ignore = true;
    };
  }, [id]);

  if (isLoading) {
    return <main className="community-post-state">게시글을 불러오는 중입니다.</main>;
  }

  if (!post) {
    return (
      <main className="community-post-state">
        <p>게시글을 찾을 수 없습니다.</p>
        <Link to="/community">커뮤니티로 돌아가기</Link>
      </main>
    );
  }

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
