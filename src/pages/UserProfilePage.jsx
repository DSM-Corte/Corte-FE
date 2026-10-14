import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { getUserById } from "../api/AuthApi";
import { ACCEPTED_RESULT } from "../api/SubmissionApi";
import { getUserSubmissions } from "../api/submissionStorage";
import "./MyPage.css";

function buildProfileStats(submissions) {
  const totalCount = submissions.length;
  const acceptedCount = submissions.filter(
    (submission) => submission.result === ACCEPTED_RESULT,
  ).length;
  const failedCount = totalCount - acceptedCount;
  const successRate = totalCount > 0 ? (acceptedCount / totalCount) * 100 : 0;
  const languageCount = new Set(
    submissions.map((submission) => submission.language).filter(Boolean),
  ).size;

  return {
    totalCount,
    acceptedCount,
    failedCount,
    successRate,
    languageCount,
  };
}

function UserProfilePage() {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function fetchUserProfile() {
      const nextUser = await getUserById(userId);

      if (ignore) {
        return;
      }

      setUser(nextUser);
      setSubmissions(nextUser ? getUserSubmissions(nextUser.id) : []);
      setIsLoading(false);
    }

    fetchUserProfile();

    return () => {
      ignore = true;
    };
  }, [userId]);

  const stats = useMemo(() => buildProfileStats(submissions), [submissions]);

  if (isLoading) {
    return <main className="mypage-state">프로필을 불러오는 중입니다.</main>;
  }

  if (!user) {
    return (
      <main className="mypage-state">
        <p>사용자를 찾을 수 없습니다.</p>
        <Link to="/code-review">코드 리뷰로 돌아가기</Link>
      </main>
    );
  }

  const statCards = [
    {
      label: "전체 제출 정답률",
      value: `${stats.successRate.toFixed(1)}%`,
      detail: `${stats.acceptedCount}/${stats.totalCount} accepted`,
    },
    {
      label: "정답 수",
      value: stats.acceptedCount.toLocaleString(),
      detail: "맞았습니다",
      tone: "success",
    },
    {
      label: "실패 수",
      value: stats.failedCount.toLocaleString(),
      detail: "오답 및 실행 실패",
      tone: "error",
    },
    {
      label: "언어 사용 수",
      value: stats.languageCount.toLocaleString(),
      detail: "사용한 제출 언어",
    },
    {
      label: "작성자",
      value: user.id.startsWith("ai-") ? "COTRE" : "User",
      detail: "제안 코드 작성자",
    },
  ];

  return (
    <main className="mypage">
      <section className="mypage__hero">
        <p className="mypage__eyebrow">Profile</p>
        <h1>{user.name}</h1>
        <p>{user.email}</p>
      </section>

      <section className="mypage__content">
        <div className="mypage-stat-grid" aria-label="사용자 통계">
          {statCards.map((card) => (
            <article
              className={`mypage-stat-card ${
                card.tone ? `mypage-stat-card--${card.tone}` : ""
              }`.trim()}
              key={card.label}
            >
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default UserProfilePage;
