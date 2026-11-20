import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router";
import { getAuthToken, isAuthenticated } from "./api/AuthApi";
import { getMyTheme, updateMyTheme } from "./api/UserApi";
import Header from "./components/layout/Header";
import CodeReviewPage from "./pages/CodeReviewPage";
import CodeReviewCreatePage from "./pages/CodeReviewCreatePage";
import CodeReviewDetailPage from "./pages/CodeReviewDetailPage";
import CommunityListPage from "./pages/CommunityListPage";
import CommunityPostDetailPage from "./pages/CommunityPostDetailPage";
import CommunityWritePage from "./pages/CommunityWritePage";
import LeaderboardPage from "./pages/LeaderboardPage";
import LoginPage from "./pages/LoginPage";
import MainPage from "./pages/MainPage";
import MyPage from "./pages/MyPage";
import ProblemDetailPage from "./pages/ProblemDetailPage";
import ProblemListPage from "./pages/ProblemListPage";
import ProblemSetCreatePage from "./pages/ProblemSetCreatePage";
import ProblemSetsPage from "./pages/ProblemSetsPage";
import ProblemSubmissionsPage from "./pages/ProblemSubmissionsPage";
import ProblemSubmitPage from "./pages/ProblemSubmitPage";
import SignupPage from "./pages/SignupPage";
import SubmissionDetailPage from "./pages/SubmissionDetailPage";
import UserProfilePage from "./pages/UserProfilePage";
import "./styles/dark-overrides.css";

const THEME_STORAGE_KEY = "cotre_theme";
const ACCENT_STORAGE_KEY = "cotre_accent";
const ACCENT_COLORS = ["red", "orange", "yellow", "green", "blue", "indigo", "violet", "pink"];

function getInitialAccent() {
  const storedAccent = window.localStorage.getItem(ACCENT_STORAGE_KEY);

  if (ACCENT_COLORS.includes(storedAccent)) {
    return storedAccent;
  }

  return "blue";
}

// 저장 요청을 하나씩 차례로 보내서 서버에 마지막으로 고른 값이 남게 한다
let themeSaveQueue = Promise.resolve();

// 로그인한 회원만 서버에 저장한다. 실패해도 화면 테마는 바꾼 채로 두고 다음 로그인 때 서버 값을 다시 불러온다
function saveThemeToServer(change) {
  if (!isAuthenticated()) {
    return;
  }

  themeSaveQueue = themeSaveQueue.then(() => updateMyTheme(change)).catch(() => {});
}

function getInitialTheme() {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function ProtectedRoute({ children, message }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: `${location.pathname}${location.search}`,
          message,
        }}
      />
    );
  }

  return children;
}

function AppRoutes({ theme, accent, onToggleTheme, onChangeTheme, onChangeAccent, onLoadServerTheme }) {
  const location = useLocation();
  const isAuthPage = ["/login", "/signup"].includes(location.pathname);
  const token = getAuthToken();

  // 로그인하면 서버에 저장된 테마를 불러온다(서버 값 우선)
  useEffect(() => {
    if (!token) {
      return;
    }

    onLoadServerTheme();
  }, [token, onLoadServerTheme]);

  return (
    <>
      {!isAuthPage && <Header theme={theme} onToggleTheme={onToggleTheme} />}
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/code-review"
          element={
            <ProtectedRoute message="코드 리뷰를 보려면 먼저 로그인해주세요.">
              <CodeReviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/code-review/new"
          element={
            <ProtectedRoute message="코드 리뷰를 작성하려면 먼저 로그인해주세요.">
              <CodeReviewCreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/code-review/:id"
          element={
            <ProtectedRoute message="코드 리뷰를 보려면 먼저 로그인해주세요.">
              <CodeReviewDetailPage />
            </ProtectedRoute>
          }
        />
        <Route path="/community" element={<CommunityListPage />} />
        <Route path="/community/posts/:id" element={<CommunityPostDetailPage />} />
        <Route
          path="/community/write"
          element={
            <ProtectedRoute message="게시글을 작성하려면 먼저 로그인해주세요.">
              <CommunityWritePage />
            </ProtectedRoute>
          }
        />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route
          path="/mypage"
          element={
            <ProtectedRoute message="마이페이지를 보려면 먼저 로그인해주세요.">
              <MyPage
                theme={theme}
                accent={accent}
                onChangeTheme={onChangeTheme}
                onChangeAccent={onChangeAccent}
              />
            </ProtectedRoute>
          }
        />
        <Route path="/users/:userId" element={<UserProfilePage />} />
        <Route path="/problem-sets" element={<ProblemSetsPage />} />
        <Route
          path="/problem-sets/new"
          element={
            <ProtectedRoute message="문제집을 만들려면 먼저 로그인해주세요.">
              <ProblemSetCreatePage />
            </ProtectedRoute>
          }
        />
        <Route path="/problems" element={<ProblemListPage />} />
        <Route
          path="/submissions"
          element={
            <ProtectedRoute message="제출 기록을 보려면 먼저 로그인해주세요.">
              <ProblemSubmissionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/submissions/:submissionId"
          element={
            <ProtectedRoute message="제출 상세를 보려면 먼저 로그인해주세요.">
              <SubmissionDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/problems/:id/submit"
          element={
            <ProtectedRoute message="제출하려면 먼저 로그인해주세요.">
              <ProblemSubmitPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/problems/:id/submissions"
          element={
            <ProtectedRoute message="제출 기록을 보려면 먼저 로그인해주세요.">
              <ProblemSubmissionsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/problems/:id" element={<ProblemDetailPage />} />
      </Routes>
    </>
  );
}

function App() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [accent, setAccent] = useState(getInitialAccent);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
    window.localStorage.setItem(ACCENT_STORAGE_KEY, accent);
  }, [accent]);

  // 서버 테마를 불러오는 동안 사용자가 테마를 바꿨는지 기억한다
  const userChangedThemeRef = useRef(false);

  // 서버는 대문자(DARK, PINK), 화면은 소문자(dark, pink)를 쓴다
  // 서버 테마를 불러오는 effect가 매번 다시 돌지 않도록 함수를 한 번만 만든다
  const loadServerTheme = useCallback(() => {
    userChangedThemeRef.current = false;

    getMyTheme()
      .then((serverTheme) => {
        // 불러오는 사이에 사용자가 바꿨으면 늦게 온 서버 값으로 덮어쓰지 않는다
        if (userChangedThemeRef.current) {
          return;
        }

        setTheme(serverTheme.mode.toLowerCase());
        setAccent(serverTheme.color.toLowerCase());
      })
      .catch(() => {});
  }, []);

  function changeTheme(nextTheme) {
    userChangedThemeRef.current = true;
    setTheme(nextTheme);
    saveThemeToServer({ mode: nextTheme.toUpperCase() });
  }

  function toggleTheme() {
    changeTheme(theme === "dark" ? "light" : "dark");
  }

  function changeAccent(nextAccent) {
    userChangedThemeRef.current = true;
    setAccent(nextAccent);
    saveThemeToServer({ color: nextAccent.toUpperCase() });
  }

  return (
    <BrowserRouter>
      <AppRoutes
        theme={theme}
        accent={accent}
        onToggleTheme={toggleTheme}
        onChangeTheme={changeTheme}
        onChangeAccent={changeAccent}
        onLoadServerTheme={loadServerTheme}
      />
    </BrowserRouter>
  );
}

export default App;
