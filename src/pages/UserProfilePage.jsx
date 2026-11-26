import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ApiError } from "../api/apiClient";
import { getUserProfile } from "../api/UserApi";
import { ProblemStatsView } from "../components/MyProblemAnalysis";
import "./MyPage.css";

function UserProfilePage() {
  const { userId } = useParams();
  // { loading } → { profile } 또는 { notFound } 또는 { error }
  const [result, setResult] = useState({ loading: true });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function fetchUserProfile() {
      setResult({ loading: true });

      try {
        const profile = await getUserProfile(userId);

        if (!ignore) {
          setResult({ profile });
        }
      } catch (error) {
        if (ignore) {
          return;
        }

        // 없는 회원(404)과 숫자가 아닌 주소(400)는 "찾을 수 없음"으로 보여준다
        if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
          setResult({ notFound: true });
          return;
        }

        setResult({ error: error.message || "프로필을 불러오지 못했습니다." });
      }
    }

    fetchUserProfile();

    return () => {
      ignore = true;
    };
  }, [userId, retry]);

  if (result.loading) {
    return <main className="mypage-state">프로필을 불러오는 중입니다.</main>;
  }

  if (result.notFound) {
    return (
      <main className="mypage-state">
        <p>사용자를 찾을 수 없습니다.</p>
        <Link to="/leaderboard">리더보드로 돌아가기</Link>
      </main>
    );
  }

  if (result.error) {
    return (
      <main className="mypage-state" role="alert">
        <p>{result.error}</p>
        <button type="button" onClick={() => setRetry((count) => count + 1)}>
          다시 불러오기
        </button>
      </main>
    );
  }

  const { profile } = result;

  return (
    <main className="mypage">
      <section className="mypage__hero">
        <p className="mypage__eyebrow">Profile</p>
        <h1>{profile.nickname}</h1>
      </section>

      <section className="mypage__content">
        <article className="mypage-grass-card mypage-analysis">
          <div className="mypage-section-heading">
            <h2>문제 분석</h2>
          </div>
          <ProblemStatsView stats={profile.stats} />
        </article>
      </section>
    </main>
  );
}

export default UserProfilePage;
