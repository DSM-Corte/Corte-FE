import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getBoardPostList } from "../api/BoardApi";
import { getProblemList } from "../api/ProblemApi";
import TierBadge from "../components/problems/TierBadge";
import "./MainPage.css";

function formatDate(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function getPostPreview(markdown) {
  return String(markdown ?? "").replace(/\s+/g, " ").trim().slice(0, 72);
}

function MainPage() {
  // 영역마다 { loading } → { items } 또는 { error }
  const [problemState, setProblemState] = useState({ loading: true });
  const [postState, setPostState] = useState({ loading: true });
  const [noticeState, setNoticeState] = useState({ loading: true });
  const recentProblems = problemState.items ?? [];
  const recentPosts = postState.items ?? [];
  const notices = noticeState.items ?? [];

  useEffect(() => {
    let ignore = false;

    // 한 영역이 실패해도(예: 비로그인 게시글 401) 다른 영역은 보여주도록 따로 불러온다
    function load(promise, setState) {
      promise.then(
        (result) => {
          if (!ignore) setState({ items: result.items });
        },
        () => {
          if (!ignore) setState({ error: true });
        },
      );
    }

    // 서버에는 푼 사람 수가 없어 최근에 등록된 문제(ID 큰 순)를 보여준다
    load(getProblemList({ sortKey: "id", sortDirection: "desc", pageSize: 5 }), setProblemState);
    load(getBoardPostList({ type: "", sortKey: "latest", pageSize: 5 }), setPostState);
    load(getBoardPostList({ type: "notice", sortKey: "latest", pageSize: 3 }), setNoticeState);

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <main className="main-page">
      <section className="main-hero">
        <div className="main-hero__content">
          <p className="main-hero__eyebrow">COTRE Platform</p>
          <h1>문제를 풀고, 기록하고, 다시 개선하세요.</h1>
          <p>
            문제 풀이, 제출 기록, 코드 리뷰, 커뮤니티 게시글을 한 흐름 안에서
            확인할 수 있습니다.
          </p>
          <div className="main-hero__actions">
            <Link to="/problems">문제 풀기</Link>
            <Link to="/community">커뮤니티 보기</Link>
          </div>
        </div>

        <aside className="main-hero__panel" aria-label="오늘의 요약">
          <span>Today</span>
          <strong>{recentProblems.length.toLocaleString()}</strong>
          <p>추천 문제와 최근 활동을 바로 이어서 확인하세요.</p>
        </aside>
      </section>

      <section className="main-quick-grid" aria-label="주요 기능">
        <Link to="/problems" className="main-quick-card">
          <span>Problems</span>
          <strong>문제 리스트</strong>
          <p>난이도, 태그, 해결 상태로 문제를 탐색합니다.</p>
        </Link>
        <Link to="/problem-sets" className="main-quick-card">
          <span>Sets</span>
          <strong>문제집</strong>
          <p>목표에 맞는 문제 묶음을 관리합니다.</p>
        </Link>
        <Link to="/code-review" className="main-quick-card">
          <span>Review</span>
          <strong>코드 리뷰</strong>
          <p>제출한 풀이를 다시 보고 개선점을 정리합니다.</p>
        </Link>
        <Link to="/mypage" className="main-quick-card">
          <span>Stats</span>
          <strong>마이페이지</strong>
          <p>정답률, 잔디, 언어 사용 기록을 확인합니다.</p>
        </Link>
      </section>

      <section className="main-dashboard">
        <article className="main-section main-section--wide">
          <div className="main-section__head">
            <div>
              <p>Recent</p>
              <h2>최근 문제</h2>
            </div>
            <Link to="/problems">전체 보기</Link>
          </div>

          <div className="main-problem-list">
            {problemState.loading ? (
              <p className="main-empty">문제를 불러오는 중입니다.</p>
            ) : problemState.error ? (
              <p className="main-empty" role="alert">문제를 불러오지 못했습니다.</p>
            ) : recentProblems.length === 0 ? (
              <p className="main-empty">등록된 문제가 없습니다.</p>
            ) : (
              recentProblems.map((problem) => (
                <Link
                  to={`/problems/${problem.id}`}
                  className="main-problem-row"
                  key={problem.id}
                >
                  <span className="main-problem-row__id">#{problem.id}</span>
                  <strong>{problem.title}</strong>
                  <TierBadge tier={problem.tier} showName />
                  <span>{problem.category}</span>
                </Link>
              ))
            )}
          </div>
        </article>

        <article className="main-section">
          <div className="main-section__head">
            <div>
              <p>Notice</p>
              <h2>공지</h2>
            </div>
            <Link to="/community">더 보기</Link>
          </div>

          <div className="main-post-list">
            {noticeState.loading ? (
              <p className="main-empty">공지를 불러오는 중입니다.</p>
            ) : noticeState.error ? (
              <p className="main-empty" role="alert">공지를 불러오지 못했습니다.</p>
            ) : notices.length === 0 ? (
              <p className="main-empty">등록된 공지가 없습니다.</p>
            ) : (
              notices.map((post) => (
                <Link to={`/community/posts/${post.id}`} className="main-post" key={post.id}>
                  <strong>{post.title}</strong>
                  <span>{formatDate(post.createdAt)}</span>
                </Link>
              ))
            )}
          </div>
        </article>

        <article className="main-section">
          <div className="main-section__head">
            <div>
              <p>Community</p>
              <h2>최근 게시글</h2>
            </div>
            <Link to="/community/write">글쓰기</Link>
          </div>

          <div className="main-post-list">
            {postState.loading ? (
              <p className="main-empty">게시글을 불러오는 중입니다.</p>
            ) : postState.error ? (
              <p className="main-empty" role="alert">게시글을 불러오지 못했습니다.</p>
            ) : recentPosts.length === 0 ? (
              <p className="main-empty">등록된 게시글이 없습니다.</p>
            ) : (
              recentPosts.map((post) => (
                <Link to={`/community/posts/${post.id}`} className="main-post" key={post.id}>
                  <strong>{post.title}</strong>
                  <small>{getPostPreview(post.markdown)}</small>
                  <span>{post.authorName}</span>
                </Link>
              ))
            )}
          </div>
        </article>
      </section>
    </main>
  );
}

export default MainPage;
