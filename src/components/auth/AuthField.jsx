import Input from "../common/Input";

function AuthField({ id, label, ...props }) {
  return (
    <label className="auth-field" htmlFor={id}>
      <span className="auth-field__label">{label}</span>
      <Input id={id} aria-label={label} {...props} />
    </label>
  );
}

export default AuthField;
