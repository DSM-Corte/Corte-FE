import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { signup } from "../api/AuthApi";
import AuthCard from "../components/auth/AuthCard";
import AuthDivider from "../components/auth/AuthDivider";
import AuthField from "../components/auth/AuthField";
import AuthLayout from "../components/auth/AuthLayout";
import SocialAuthButton from "../components/auth/SocialAuthButton";
import Button from "../components/common/Button";

function SignupPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setIsLoading(true);
    setMessage("");

    const formData = new FormData(form);

    try {
      const result = await signup({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
        passwordConfirm: formData.get("passwordConfirm"),
      });

      navigate("/login", {
        replace: true,
        state: {
          email: result.user.email,
          message: `${result.user.name}님, 회원가입이 완료되었습니다. 로그인해주세요.`,
        },
      });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout showBrand={false} showFooter={false}>
      <AuthCard
        title="COTRE 계정 생성"
        description="실력을 증명하고 최고의 엔지니어들과 함께 성장하세요."
      >
        <form className="auth-form" onSubmit={handleSubmit}>
          <AuthField
            id="signup-name"
            label="이름"
            name="name"
            placeholder="이름"
            autoComplete="name"
            required
          />
          <AuthField
            id="signup-email"
            label="이메일 주소"
            name="email"
            type="email"
            placeholder="이메일 주소"
            autoComplete="email"
            required
          />
          <AuthField
            id="signup-password"
            label="비밀번호"
            name="password"
            type="password"
            placeholder="비밀번호"
            autoComplete="new-password"
            required
          />
          <AuthField
            id="signup-password-confirm"
            label="비밀번호 확인"
            name="passwordConfirm"
            type="password"
            placeholder="비밀번호 확인"
            autoComplete="new-password"
            required
          />

          <Button
            className="auth-submit"
            type="submit"
            size="large"
            loading={isLoading}
          >
            회원가입
          </Button>
          <p className="auth-message" aria-live="polite">
            {message}
          </p>
        </form>

        <AuthDivider />

        <div className="auth-social-list">
          <SocialAuthButton provider="google">
            Google로 가입하기
          </SocialAuthButton>
          <SocialAuthButton provider="github">
            GitHub로 가입하기
          </SocialAuthButton>
        </div>

        <p className="auth-switch auth-switch--separated">
          이미 계정이 있으신가요?{" "}
          <Link className="auth-link" to="/login">
            로그인
          </Link>
        </p>

        <p className="auth-terms">
          가입함으로써 COTRE의 서비스 이용약관 및 개인정보 처리방침에 동의하게
          됩니다.
        </p>
      </AuthCard>
    </AuthLayout>
  );
}

export default SignupPage;
