import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { getAuthToken, getCurrentUser } from "../api/AuthApi";
import { getSubmissionList } from "../api/SubmissionApi";
import "./MyPage.css";

const ACCEPTED_RESULT = "맞았습니다";
const GRASS_DAYS = 56;
const GRASS_LEVELS = [
  { level: 0, label: "0%" },
  { level: 1, label: "1-20%" },
  { level: 2, label: "21-40%" },
  { level: 3, label: "41-60%" },
  { level: 4, label: "61-80%" },
  { level: 5, label: "81-100%" },
];

function getDateKey(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateLabel(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function getGrassLevel(count, maxCount) {
  if (count <= 0 || maxCount <= 0) {
    return 0;
  }

  const ratio = count / maxCount;

  return Math.min(5, Math.max(1, Math.ceil(ratio * 5)));
}

function createGrassDays(submissions) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const countsByDate = submissions.reduce((counts, submission) => {
    const key = getDateKey(submission.submittedAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  }, new Map());

  const maxCount = Math.max(0, ...countsByDate.values());

  return Array.from({ length: GRASS_DAYS }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (GRASS_DAYS - index - 1));

    const key = getDateKey(date);
    const count = countsByDate.get(key) ?? 0;

    return {
      key,
      count,
      label: formatDateLabel(date),
      level: getGrassLevel(count, maxCount),
      ratio: maxCount > 0 ? Math.round((count / maxCount) * 100) : 0,
    };
  });
}

function calculateRanking({ acceptedCount, failedCount, languageCount }) {
  if (acceptedCount === 0) {
    return "미집계";
  }

  const rank = Math.max(1, 1200 - acceptedCount * 35 - languageCount * 12 + failedCount * 4);

  return `#${rank.toLocaleString()}`;
}

function buildStats(submissions) {
  const totalCount = submissions.length;
  const acceptedCount = submissions.filter(
    (submission) => submission.result === ACCEPTED_RESULT,
  ).length;
  const failedCount = totalCount - acceptedCount;
  const successRate = totalCount > 0 ? (acceptedCount / totalCount) * 100 : 0;
  const languageCounts = submissions.reduce((counts, submission) => {
    const language = submission.language || "unknown";
    counts.set(language, (counts.get(language) ?? 0) + 1);
    return counts;
  }, new Map());
  const languages = [...languageCounts.entries()]
    .map(([language, count]) => ({ language, count }))
    .sort((left, right) => right.count - left.count || left.language.localeCompare(right.language));
  const languageCount = languages.length;

  return {
    totalCount,
    acceptedCount,
    failedCount,
    successRate,
    languageCount,
    languages,
    grassDays: createGrassDays(submissions),
    ranking: calculateRanking({ acceptedCount, failedCount, languageCount }),
  };
}

function MyPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchMyPage() {
      const currentUser = await getCurrentUser();
      const currentToken = getAuthToken();

      if (!currentUser || !currentToken) {
        navigate("/login", {
          replace: true,
          state: {
            from: "/mypage",
            message: "마이페이지를 보려면 먼저 로그인해주세요.",
          },
        });
        return;
      }

      const nextSubmissions = await getSubmissionList();

      setUser(currentUser);
      setSubmissions(nextSubmissions);
      setIsLoading(false);
    }

    fetchMyPage();
  }, [navigate]);

  const stats = useMemo(() => buildStats(submissions), [submissions]);

  if (isLoading) {
    return <main className="mypage-state">마이페이지를 불러오는 중입니다.</main>;
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
      detail: stats.languages.length
        ? stats.languages.map((item) => item.language).join(" / ")
        : "아직 사용한 언어 없음",
    },
    {
      label: "랭킹",
      value: stats.ranking,
      detail: "제출 통계 기반",
    },
  ];

  return (
    <main className="mypage">
      <section className="mypage__hero">
        <p className="mypage__eyebrow">My Page</p>
        <h1>{user.name}님</h1>
        <p>{user.email}</p>
      </section>

      <section className="mypage__content">
        <div className="mypage-stat-grid" aria-label="제출 통계">
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

        <article className="mypage-grass-card">
          <div className="mypage-section-heading">
            <div>
              <h2>잔디</h2>
              <p>최근 {GRASS_DAYS}일 제출 기록</p>
            </div>
            <strong>{stats.totalCount.toLocaleString()} submissions</strong>
          </div>

          <div className="mypage-grass" aria-label="최근 제출 잔디">
            {stats.grassDays.map((day) => (
              <span
                className="mypage-grass__cell"
                data-level={day.level}
                title={`${day.label}: ${day.count}회 제출 · ${day.ratio}%`}
                aria-label={`${day.label} ${day.count}회 제출 ${day.ratio}%`}
                key={day.key}
              />
            ))}
          </div>

          <div className="mypage-grass-legend" aria-label="잔디 색상 기준">
            <span>색상 기준</span>
            {GRASS_LEVELS.map((item) => (
              <span className="mypage-grass-legend__item" key={item.level}>
                <i
                  className="mypage-grass__cell"
                  data-level={item.level}
                  aria-hidden="true"
                />
                {item.label}
              </span>
            ))}
          </div>

          <div className="mypage-language-strip" aria-label="언어 사용 현황">
            {stats.languages.length === 0 ? (
              <span>아직 제출한 언어가 없습니다.</span>
            ) : (
              stats.languages.map((item) => (
                <span key={item.language}>
                  {item.language}
                  <strong>{item.count}</strong>
                </span>
              ))
            )}
          </div>
        </article>
      </section>
    </main>
  );
}

export default MyPage;
