import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router";
import { isAuthenticated, logout } from "../../api/AuthApi";
import Logo from "../common/Logo";

function Header({ theme = "light", onToggleTheme }) {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(() => isAuthenticated());
  const userLink = isLoggedIn ? "/mypage" : "/login";
  const userLabel = isLoggedIn ? "마이페이지" : "로그인";
  const isDarkTheme = theme === "dark";

  async function handleLogout() {
    await logout();
    setIsLoggedIn(false);
    navigate("/", { replace: true });
  }

  return (
    <header className="header">
      <div className="header__inner">
        <Link to="/" className="header__logo" aria-label="COTRE 홈">
          <Logo size="small" />
        </Link>

        <nav className="header__nav">
          <NavLink
            to="/problems"
            className={({ isActive }) =>
              `header__link ${isActive ? "header__link--active" : ""}`.trim()
            }
          >
            문제 리스트
          </NavLink>
          <NavLink
            to="/problem-sets"
            className={({ isActive }) =>
              `header__link ${isActive ? "header__link--active" : ""}`.trim()
            }
          >
            문제집
          </NavLink>
          <NavLink
            to="/code-review"
            className={({ isActive }) =>
              `header__link ${isActive ? "header__link--active" : ""}`.trim()
            }
          >
            코드 리뷰
          </NavLink>
          <NavLink
            to="/leaderboard"
            className={({ isActive }) =>
              `header__link ${isActive ? "header__link--active" : ""}`.trim()
            }
          >
            리더보드
          </NavLink>
          <NavLink
            to="/community"
            className={({ isActive }) =>
              `header__link ${isActive ? "header__link--active" : ""}`.trim()
            }
          >
            커뮤니티
          </NavLink>
        </nav>

        <div className="header__auth">
          <button
            type="button"
            className="header__theme-button"
            onClick={onToggleTheme}
            aria-label={isDarkTheme ? "라이트 모드로 변경" : "다크 모드로 변경"}
            title={isDarkTheme ? "라이트 모드" : "다크 모드"}
          >
            <svg
              aria-hidden="true"
              className="header__icon"
              fill="none"
              viewBox="0 0 24 24"
            >
              {isDarkTheme ? (
                <>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </>
              ) : (
                <path d="M21 14.7A8 8 0 0 1 9.3 3 7 7 0 1 0 21 14.7z" />
              )}
            </svg>
          </button>
          <Link to={userLink} className="header__icon-link" aria-label={userLabel}>
            <svg
              aria-hidden="true"
              className="header__icon"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c1.7-4 4.4-6 8-6s6.3 2 8 6" />
            </svg>
          </Link>
          {isLoggedIn && (
            <button
              type="button"
              className="header__logout-button"
              onClick={handleLogout}
            >
              로그아웃
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
