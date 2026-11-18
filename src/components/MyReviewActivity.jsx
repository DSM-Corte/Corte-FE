import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getMyReviewRequests } from "../api/CodeReviewApi";

const tabs = [
  { key: "requests", label: "내 리뷰 요청" },
  { key: "reviews", label: "작성한 리뷰" },
  { key: "comments", label: "코드 리뷰 댓글" },
  { key: "community", label: "커뮤니티 댓글" },
];
const PAGE_SIZE = 5;

function MyReviewActivity() {
  const [tab, setTab] = useState("requests");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (tab !== "requests") {
      return undefined;
    }

    let ignore = false;

    getMyReviewRequests({ page, size: PAGE_SIZE })
      .then((nextResult) => {
        if (!ignore) {
          setResult(nextResult);
          setError("");
        }
      })
      .catch((fetchError) => {
        if (!ignore) {
          setResult({ content: [], page: 0, totalPages: 0, totalElements: 0 });
          setError(fetchError.message);
        }
      });

    return () => {
      ignore = true;
    };
  }, [tab, page]);

  const items = result?.content ?? [];
  const totalPages = Math.max(1, result?.totalPages ?? 1);

  return (
    <article className="mypage-grass-card mypage-activity">
      <div className="mypage-section-heading">
        <div>
          <h2>내 리뷰 활동</h2>
          <p>내가 요청한 코드 리뷰를 확인하세요.</p>
        </div>
      </div>
      <nav className="mypage-activity__tabs" aria-label="리뷰 활동 종류">
        {tabs.map(({ key, label }) => (
          <button type="button" key={key} aria-pressed={tab === key}
            onClick={() => { setTab(key); setPage(0); }}>
            {label}{key === "requests" && result ? ` (${result.totalElements})` : ""}
          </button>
        ))}
      </nav>
      {tab !== "requests" ? (
        <p className="mypage-grass-empty">
          {tab === "community" ? "커뮤니티 댓글" : "이 활동의 조회"} 기능이 아직 연결되지 않았습니다.
        </p>
      ) : !result ? (
        <p className="mypage-grass-empty">불러오는 중입니다.</p>
      ) : error ? (
        <p className="mypage-grass-empty">{error}</p>
      ) : items.length === 0 ? (
        <p className="mypage-grass-empty">요청한 리뷰가 없습니다.</p>
      ) : (
        <>
          <ul className="mypage-activity__list">
            {items.map((item) => (
              <li key={item.id}>
                <Link to={`/code-review/${encodeURIComponent(item.id)}`}>
                  <strong>#{item.problemId} {item.problemTitle}</strong>
                  <span>{item.status === "CLOSED" ? "닫힘" : "열림"}</span>
                  {item.createdAt && <time dateTime={item.createdAt}>
                    {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                  </time>}
                </Link>
              </li>
            ))}
          </ul>
          <nav className="mypage-activity__pagination" aria-label="리뷰 활동 페이지">
            <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>이전</button>
            <span>{page + 1} / {totalPages}</span>
            <button type="button" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>다음</button>
          </nav>
        </>
      )}
    </article>
  );
}

export default MyReviewActivity;
