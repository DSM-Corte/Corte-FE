import "./TierBadge.css";

const tierClassMap = {
  Bronze: "bronze",
  Silver: "silver",
  Gold: "gold",
  Platinum: "platinum",
  Emerald: "emerald",
  Diamond: "diamond",
  Master: "master",
};

const tierAssetNameMap = {
  Bronze: "bronze",
  Silver: "silver",
  Gold: "gold",
  Platinum: "platinum",
  Emerald: "emerald",
  Diamond: "diamond",
  Master: "master",
};

function parseTier(tier) {
  const [name = "Unrated", grade = ""] = String(tier).split(" ");
  const assetName = tierAssetNameMap[name];
  const fileName =
    name === "Master"
      ? "master.png"
      : assetName && grade
        ? `${assetName}-${grade}.png`
        : "unrated.png";

  return {
    name,
    grade,
    className: tierClassMap[name] ?? "unrated",
    iconSrc: new URL(`../../assets/tiers/${fileName}`, import.meta.url).href,
  };
}

function TierBadge({ tier, showName = false }) {
  const parsedTier = parseTier(tier);

  return (
    <span className="tier-display" title={tier}>
      <img
        className={`tier-icon tier-icon--${parsedTier.className}`}
        src={parsedTier.iconSrc}
        alt=""
        aria-hidden="true"
      />
      {showName && <span className="tier-display__name">{tier}</span>}
    </span>
  );
}

export default TierBadge;
