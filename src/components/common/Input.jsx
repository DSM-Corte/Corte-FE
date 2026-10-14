import "./Input.css";

function Input({ className = "", ...props }) {
  return <input className={`input ${className}`.trim()} {...props} />;
}

export default Input;
