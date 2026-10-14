import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router";
import { isAuthenticated } from "./api/AuthApi";
import Header from "./components/layout/Header";
import CodeReviewPage from "./pages/CodeReviewPage";
import CodeReviewCreatePage from "./pages/CodeReviewCreatePage";
import CodeReviewDetailPage from "./pages/CodeReviewDetailPage";
import CodeReviewSuggestionPage from "./pages/CodeReviewSuggestionPage";
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

function AppRoutes({ theme, onToggleTheme }) {
  const location = useLocation();
  const isAuthPage = ["/login", "/signup"].includes(location.pathname);

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
          path="/code-review/:id/suggestions/new"
          element={
            <ProtectedRoute message="코드 제안을 작성하려면 먼저 로그인해주세요.">
              <CodeReviewSuggestionPage />
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
              <MyPage />
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

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  }

  return (
    <BrowserRouter>
      <AppRoutes theme={theme} onToggleTheme={toggleTheme} />
    </BrowserRouter>
  );
}

export default App;
