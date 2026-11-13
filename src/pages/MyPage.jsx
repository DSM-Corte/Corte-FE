import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { getAuthToken, getCurrentUser } from "../api/AuthApi";
import { getMyGrass } from "../api/UserApi";
import "./MyPage.css";

const GRASS_DAYS = 365;
const WEEKDAY_LABELS = ["", "월", "", "수", "", "금", ""];
const GRASS_LEVELS = [
  { level: 0, label: "0문제" },
  { level: 1, label: "1문제" },
  { level: 2, label: "2문제" },
  { level: 3, label: "3~4문제" },
  { level: 4, label: "5문제 이상" },
];

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateLabel(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function getGrassLevel(count) {
  if (count === 0) {
    return 0;
  }

  if (count === 1) {
    return 1;
  }

  if (count === 2) {
    return 2;
  }

  if (count <= 4) {
    return 3;
  }

  return 4;
}

// API는 푼 날만 주므로 오늘 포함 최근 365일을 만들고 빈 날은 0으로 채운다
function buildGrassDays(grass) {
  const countByDate = {};

  for (const item of grass) {
    countByDate[item.date] = item.count;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = [];

  for (let i = GRASS_DAYS - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);

    const count = countByDate[getDateKey(date)] ?? 0;

    days.push({ key: getDateKey(date), date, count, level: getGrassLevel(count) });
  }

  return days;
}

// 일요일부터 토요일까지 7칸씩 한 주로 묶는다
// 첫 주는 시작 요일 앞을 빈칸(null)으로 채운다
function buildWeeks(days) {
  const cells = [];

  for (let i = 0; i < days[0].date.getDay(); i++) {
    cells.push(null);
  }

  for (const day of days) {
    cells.push(day);
  }

  const weeks = [];

  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return weeks;
}

// 그 주에 1일이 있으면 그 달 이름을 붙인다
function getMonthLabel(week) {
  for (const day of week) {
    if (day && day.date.getDate() === 1) {
      return `${day.date.getMonth() + 1}월`;
    }
  }

  return "";
}

function getLongestStreak(days) {
  let longest = 0;
  let current = 0;

  for (const day of days) {
    if (day.count > 0) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }

  return longest;
}

function getCurrentStreak(days) {
  let index = days.length - 1;

  // 오늘 아직 안 풀었으면 어제부터 센다
  if (days[index].count === 0) {
    index--;
  }

  let streak = 0;

  while (index >= 0 && days[index].count > 0) {
    streak++;
    index--;
  }

  return streak;
}

function buildStats(grass) {
  const days = buildGrassDays(grass);

  let solvedCount = 0;

  for (const item of grass) {
    solvedCount += item.count;
  }

  return {
    solvedCount,
    activeDayCount: grass.length,
    currentStreak: getCurrentStreak(days),
    longestStreak: getLongestStreak(days),
    weeks: buildWeeks(days),
  };
}

function MyPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [grass, setGrass] = useState([]);
  const [grassError, setGrassError] = useState("");
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

      try {
        const nextGrass = await getMyGrass();
        setGrass(nextGrass);
      } catch (error) {
        // 토큰이 만료되거나 잘못되면 다시 로그인하게 보낸다
        if (error.status === 401) {
          navigate("/login", {
            replace: true,
            state: {
              from: "/mypage",
              message: "로그인이 만료되었어요. 다시 로그인해주세요.",
            },
          });
          return;
        }

        setGrassError(error.message);
      }

      setUser(currentUser);
      setIsLoading(false);
    }

    fetchMyPage();
  }, [navigate]);

  const stats = useMemo(() => buildStats(grass), [grass]);

  if (isLoading) {
    return <main className="mypage-state">마이페이지를 불러오는 중입니다.</main>;
  }

  const statCards = [
    {
      label: "푼 문제",
      value: stats.solvedCount.toLocaleString(),
      detail: "최근 1년 합계",
    },
    {
      label: "활동한 날",
      value: `${stats.activeDayCount}일`,
      detail: "1문제 이상 맞힌 날",
    },
    {
      label: "현재 연속",
      value: `${stats.currentStreak}일`,
      detail: "지금 이어가는 기록",
    },
    {
      label: "최장 연속",
      value: `${stats.longestStreak}일`,
      detail: "최근 1년 최고 기록",
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
        <div className="mypage-stat-grid" aria-label="풀이 통계">
          {statCards.map((card) => (
            <article className="mypage-stat-card" key={card.label}>
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
              <p>최근 1년 동안 날마다 맞힌 문제 수</p>
            </div>
            <strong>{stats.activeDayCount}일 활동</strong>
          </div>

          <div
            className="mypage-grass"
            aria-label="최근 1년 잔디"
            // 화면이 좁아 가로 스크롤이 생기면 최근 날짜가 보이도록 오른쪽 끝으로 옮긴다
            ref={(element) => {
              if (element) {
                element.scrollLeft = element.scrollWidth;
              }
            }}
          >
            <div className="mypage-grass__weekdays" aria-hidden="true">
              {/* 첫 줄은 월 이름 자리라 비워 둔다 */}
              <span />
              {WEEKDAY_LABELS.map((label, index) => (
                <span key={index}>{label}</span>
              ))}
            </div>

            <div className="mypage-grass__weeks">
              {stats.weeks.map((week) => (
                <div className="mypage-grass__week" key={week.find(Boolean).key}>
                  <span className="mypage-grass__month">{getMonthLabel(week)}</span>
                  {week.map((day, index) =>
                    day ? (
                      <span
                        className="mypage-grass__cell"
                        data-level={day.level}
                        title={`${formatDateLabel(day.date)} ${day.count}문제`}
                        aria-label={`${formatDateLabel(day.date)} ${day.count}문제`}
                        key={day.key}
                      />
                    ) : (
                      <span className="mypage-grass__blank" key={`blank-${index}`} />
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mypage-grass-legend" aria-label="잔디 색상 기준">
            <span>적음</span>
            {GRASS_LEVELS.map((item) => (
              <i
                className="mypage-grass__cell"
                data-level={item.level}
                title={item.label}
                key={item.level}
              />
            ))}
            <span>많음</span>
          </div>

          {grassError && (
            <p className="mypage-grass-empty">잔디를 불러오지 못했어요. {grassError}</p>
          )}

          {!grassError && grass.length === 0 && (
            <p className="mypage-grass-empty">
              아직 맞힌 문제가 없어요{" "}
              <Link to="/problems">첫 문제 풀러 가기</Link>
            </p>
          )}
        </article>
      </section>
    </main>
  );
}

export default MyPage;
