import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { login } from "../api/AuthApi";
import AuthCard from "../components/auth/AuthCard";
import AuthDivider from "../components/auth/AuthDivider";
import AuthField from "../components/auth/AuthField";
import AuthLayout from "../components/auth/AuthLayout";
import SocialAuthButton from "../components/auth/SocialAuthButton";
import Button from "../components/common/Button";

function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const signupEmail = location.state?.email ?? "";
  const redirectPath = location.state?.from ?? "/";
  const [message, setMessage] = useState(location.state?.message ?? "");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);

    try {
      await login({
        email: formData.get("email"),
        password: formData.get("password"),
        remember: Boolean(formData.get("remember")),
      });

      navigate(redirectPath, { replace: true });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout>
      <AuthCard
        title="COTRE에 로그인하세요"
        description="코드 리뷰와 성장의 생태계에 다시 오신 것을 환영합니다."
      >
        <form className="auth-form" onSubmit={handleSubmit}>
          <AuthField
            id="login-email"
            label="이메일"
            name="email"
            type="email"
            placeholder="이메일"
            autoComplete="username"
            defaultValue={signupEmail}
            required
          />
          <AuthField
            id="login-password"
            label="비밀번호"
            name="password"
            type="password"
            placeholder="비밀번호"
            autoComplete="current-password"
            required
          />

          <div className="auth-form__row">
            <label className="auth-check">
              <input type="checkbox" name="remember" />
              <span>로그인 상태 유지</span>
            </label>
            <button className="auth-link" type="button">
              비밀번호를 잊으셨나요?
            </button>
          </div>

          <Button
            className="auth-submit"
            type="submit"
            size="large"
            loading={isLoading}
          >
            로그인
          </Button>
          <p className="auth-message" aria-live="polite">
            {message}
          </p>
        </form>

        <AuthDivider />

        <div className="auth-social-list">
          <SocialAuthButton provider="google">
            Google로 계속하기
          </SocialAuthButton>
          <SocialAuthButton provider="github">
            GitHub으로 계속하기
          </SocialAuthButton>
        </div>

        <p className="auth-switch">
          계정이 없으신가요?{" "}
          <Link className="auth-link" to="/signup">
            회원가입
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}

export default LoginPage;
