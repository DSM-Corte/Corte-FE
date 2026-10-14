import "./Button.css";

const variantClassMap = {
  primary: "contained",
};

const sizeClassMap = {
  small: "sm",
  medium: "md",
  large: "lg",
};

function Button({
  children,
  variant = "primary",
  size = "medium",
  loading = false,
  disabled = false,
  className = "",
  ...rest
}) {
  const isDisabled = disabled || loading;
  const variantClass = variantClassMap[variant] ?? variant;
  const sizeClass = sizeClassMap[size] ?? size;

  return (
    <button
      className={`button button--${variantClass} button--${sizeClass} ${className}`.trim()}
      disabled={isDisabled}
      {...rest}
    >
      {loading && <span className="button__spinner" />}

      <span className="button_text">{children}</span>
    </button>
  );
}

export default Button;
