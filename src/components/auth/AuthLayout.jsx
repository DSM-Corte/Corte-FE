import { Link } from "react-router";
import Logo from "../common/Logo";
import "./Auth.css";

function AuthLayout({ children, showBrand = true, showFooter = true }) {
  return (
    <main className={`auth-shell ${!showBrand ? "auth-shell--centered" : ""}`}>
      {showBrand && (
        <Link to="/problems" className="auth-brand" aria-label="COTRE 문제 목록">
          <Logo size="medium" />
        </Link>
      )}

      {children}

      {showFooter && (
        <footer className="auth-footer">© 2024 COTRE. All rights reserved.</footer>
      )}
    </main>
  );
}

export default AuthLayout;
