import Button from "../common/Button";

function GoogleIcon() {
  return (
    <svg className="auth-social__icon" aria-hidden="true" viewBox="0 0 24 24">
      <path
        fill="#4285f4"
        d="M21.6 12.23c0-.74-.07-1.45-.19-2.14H12v4.05h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.44Z"
      />
      <path
        fill="#34a853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.33l-3.24-2.51c-.9.6-2.04.95-3.38.95-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A9.99 9.99 0 0 0 12 22Z"
      />
      <path
        fill="#fbbc05"
        d="M6.41 13.99A6.02 6.02 0 0 1 6.1 12c0-.69.11-1.36.31-1.99V7.42H3.07A9.99 9.99 0 0 0 2 12c0 1.61.39 3.14 1.07 4.58l3.34-2.59Z"
      />
      <path
        fill="#ea4335"
        d="M12 5.89c1.47 0 2.78.5 3.82 1.5l2.87-2.87C16.95 2.9 14.7 2 12 2a9.99 9.99 0 0 0-8.93 5.42l3.34 2.59C7.2 7.65 9.4 5.89 12 5.89Z"
      />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg
      className="auth-social__icon"
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.18-3.37-1.18-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02A9.56 9.56 0 0 1 12 7.02c.85 0 1.7.11 2.5.33 1.9-1.29 2.74-1.02 2.74-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.86v2.56c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  );
}

const iconMap = {
  google: <GoogleIcon />,
  github: <GithubIcon />,
};

function SocialAuthButton({ provider, children }) {
  return (
    <Button className="auth-social" type="button" variant="pearl" size="large">
      {iconMap[provider]}
      {children}
    </Button>
  );
}

export default SocialAuthButton;
