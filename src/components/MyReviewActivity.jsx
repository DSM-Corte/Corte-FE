import { useEffect, useState } from "react";
import { Link } from "react-router";
import { CODE_REVIEW_UPDATED_EVENT, getMyReviewActivity } from "../api/CodeReviewApi";

const tabs = [
  { key: "requests", label: "내 리뷰 요청" },
  { key: "reviews", label: "작성한 리뷰" },
  { key: "comments", label: "코드 리뷰 댓글" },
  { key: "community", label: "커뮤니티 댓글" },
];
const PAGE_SIZE = 5;

function MyReviewActivity() {
  const [activity, setActivity] = useState(getMyReviewActivity);
  const [tab, setTab] = useState("reviews");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const refresh = () => setActivity(getMyReviewActivity());
    window.addEventListener(CODE_REVIEW_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(CODE_REVIEW_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const items = activity[tab] ?? [];
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  return (
    <article className="mypage-grass-card mypage-activity">
      <div className="mypage-section-heading">
        <div>
          <h2>내 리뷰 활동</h2>
          <p>이 브라우저에 저장된 리뷰와 댓글을 확인하세요.</p>
        </div>
      </div>
      <nav className="mypage-activity__tabs" aria-label="리뷰 활동 종류">
        {tabs.map(({ key, label }) => (
          <button type="button" key={key} aria-pressed={tab === key}
            onClick={() => { setTab(key); setPage(1); }}>
            {label}{key !== "community" && ` (${activity[key].length})`}
          </button>
        ))}
      </nav>
      {tab === "community" ? (
        <p className="mypage-grass-empty">커뮤니티 댓글 조회 기능이 아직 연결되지 않았습니다.</p>
      ) : items.length === 0 ? (
        <p className="mypage-grass-empty">작성한 활동이 없습니다.</p>
      ) : (
        <>
          <ul className="mypage-activity__list">
            {items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((item) => (
              <li key={item.id}>
                <Link to={`/code-review/${encodeURIComponent(item.reviewId)}`}>
                  <strong>{item.title || item.reviewTitle}</strong>
                  {tab !== "requests" && <span>{item.reviewTitle}</span>}
                  <p>{item.body || item.description}</p>
                  {item.createdAt && <time dateTime={item.createdAt}>
                    {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                  </time>}
                </Link>
              </li>
            ))}
          </ul>
          <nav className="mypage-activity__pagination" aria-label="리뷰 활동 페이지">
            <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>이전</button>
            <span>{currentPage} / {totalPages}</span>
            <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>다음</button>
          </nav>
        </>
      )}
    </article>
  );
}

export default MyReviewActivity;
