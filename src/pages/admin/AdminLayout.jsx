import { Link, Navigate, NavLink, Outlet, useLocation } from "react-router";
import { isAdmin, isAuthenticated } from "../../api/AuthApi";
import "./Admin.css";

const adminMenus = [
  { to: "/admin/problems", label: "문제" },
  { to: "/admin/workbooks", label: "문제집" },
  { to: "/admin/github", label: "GitHub 연동" },
];

// 관리자만 children을 보여준다. 비로그인은 로그인 화면으로, 일반 회원은 403 안내를 보여준다
// 화면을 막는 것은 편의일 뿐이고 실제 권한은 서버가 검사한다
export function AdminGuard({ children }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: `${location.pathname}${location.search}`,
          message: "관리자 페이지는 로그인 후 이용할 수 있습니다.",
        }}
      />
    );
  }

  if (!isAdmin()) {
    return (
      <main className="admin-forbidden">
        <p className="admin-forbidden__code">403</p>
        <h1>접근 권한이 없습니다</h1>
        <p>관리자만 이용할 수 있는 페이지입니다.</p>
        <Link to="/">홈으로 돌아가기</Link>
      </main>
    );
  }

  return children;
}

// 관리자 화면 공통 틀(메뉴 + 하위 화면)
function AdminLayout() {
  return (
    <AdminGuard>
      <main className="admin">
        <header className="admin__head">
          <p className="admin__eyebrow">Admin</p>
          <h1>관리자 페이지</h1>
          <nav className="admin__menu" aria-label="관리자 메뉴">
            {adminMenus.map((menu) => (
              <NavLink
                to={menu.to}
                className={({ isActive }) => `admin__menu-link ${isActive ? "is-active" : ""}`.trim()}
                key={menu.to}
              >
                {menu.label}
              </NavLink>
            ))}
          </nav>
        </header>
        <Outlet />
      </main>
    </AdminGuard>
  );
}

export default AdminLayout;
