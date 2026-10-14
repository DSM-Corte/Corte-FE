import "./Logo.css";
import logoImage from "../../assets/brand/cotre-logo.png";

function Logo({ size = "medium", className = "" }) {
  return (
    <span className={`logo logo--${size} ${className}`.trim()} aria-label="COTRE">
      <img className="logo__image" src={logoImage} alt="COTRE" />
    </span>
  );
}

export default Logo;
