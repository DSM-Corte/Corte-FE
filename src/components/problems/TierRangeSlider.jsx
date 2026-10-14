import TierBadge from "./TierBadge";
import { MASTER_TIER, tierGroups, tierRankOptions } from "./problemListConfig";

const tierMarkerLabels = {
  Bronze: "브론즈",
  Silver: "실버",
  Gold: "골드",
  Platinum: "플래티넘",
  Diamond: "다이아",
  Emerald: "에메랄드",
  Master: "마스터",
};

const tierMarkerTiers = [
  ...tierGroups.map((tierGroup) => `${tierGroup} 5`),
  MASTER_TIER,
];

function getTierGroupRange(tier) {
  if (tier === MASTER_TIER) {
    const masterIndex = tierRankOptions.indexOf(MASTER_TIER);

    return {
      startIndex: masterIndex,
      endIndex: masterIndex,
    };
  }

  const [tierGroup] = tier.split(" ");

  return {
    startIndex: tierRankOptions.indexOf(`${tierGroup} 5`),
    endIndex: tierRankOptions.indexOf(`${tierGroup} 1`),
  };
}

const tierMarkers = tierMarkerTiers.map((tier, markerIndex) => {
  const [tierGroup] = tier.split(" ");
  const range = getTierGroupRange(tier);

  return {
    positionPercent: (markerIndex / (tierMarkerTiers.length - 1)) * 100,
    tier,
    label: tierMarkerLabels[tierGroup] ?? tierGroup,
    ...range,
  };
});

function clampIndex(value) {
  return Math.round(Math.min(Math.max(Number(value), 0), tierRankOptions.length - 1));
}

function getIndexFromClientX(clientX, sliderElement) {
  const rect = sliderElement.getBoundingClientRect();
  const percent = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);

  return clampIndex(percent * (tierRankOptions.length - 1));
}

function TierRangeSlider({ filters, updateFilter }) {
  const minValue = clampIndex(filters.tierMinIndex);
  const maxValue = clampIndex(filters.tierMaxIndex);
  const minPercent = (minValue / (tierRankOptions.length - 1)) * 100;
  const maxPercent = (maxValue / (tierRankOptions.length - 1)) * 100;

  function updateMin(value) {
    updateFilter("tierMinIndex", String(Math.min(clampIndex(value), maxValue)));
  }

  function updateMax(value) {
    updateFilter("tierMaxIndex", String(Math.max(clampIndex(value), minValue)));
  }

  function updateTierRange(startIndex, endIndex) {
    updateFilter("tierMinIndex", String(startIndex));
    updateFilter("tierMaxIndex", String(endIndex));
  }

  function moveNearestHandle(value) {
    const nextValue = clampIndex(value);
    const minDistance = Math.abs(nextValue - minValue);
    const maxDistance = Math.abs(nextValue - maxValue);

    if (nextValue < minValue || minDistance <= maxDistance) {
      updateMin(nextValue);
      return;
    }

    updateMax(nextValue);
  }

  function handleTrackPointerDown(event) {
    moveNearestHandle(getIndexFromClientX(event.clientX, event.currentTarget));
  }

  function updateHandleFromPointer(event, handle) {
    const sliderElement = event.currentTarget.closest(".range-slider");
    const nextValue = getIndexFromClientX(event.clientX, sliderElement);

    if (handle === "min") {
      updateMin(nextValue);
      return;
    }

    updateMax(nextValue);
  }

  function handleHandlePointerDown(event, handle) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    updateHandleFromPointer(event, handle);
  }

  function handleHandlePointerMove(event, handle) {
    if (event.buttons !== 1) {
      return;
    }

    updateHandleFromPointer(event, handle);
  }

  function selectTierGroup(marker) {
    const isFullRange = minValue === 0 && maxValue === tierRankOptions.length - 1;
    const isIncluded =
      marker.startIndex >= minValue && marker.endIndex <= maxValue;

    if (isFullRange || isIncluded) {
      updateTierRange(marker.startIndex, marker.endIndex);
      return;
    }

    updateTierRange(
      Math.min(minValue, marker.startIndex),
      Math.max(maxValue, marker.endIndex),
    );
  }

  return (
    <div className="range-control tier-range-control">
      <div className="range-control__values">
        <span>{tierRankOptions[minValue]}</span>
        <span>{tierRankOptions[maxValue]}</span>
      </div>

      <div
        className="range-slider"
        style={{
          "--range-start": `${minPercent}%`,
          "--range-end": `${maxPercent}%`,
        }}
      >
        <button
          className="range-slider__track-hit"
          type="button"
          aria-label="티어 슬라이더 위치 이동"
          onPointerDown={handleTrackPointerDown}
        />
        <button
          className="range-slider__handle"
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          style={{ "--handle-position": `${minPercent}%` }}
          onPointerDown={(event) => handleHandlePointerDown(event, "min")}
          onPointerMove={(event) => handleHandlePointerMove(event, "min")}
        />
        <button
          className="range-slider__handle"
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          style={{ "--handle-position": `${maxPercent}%` }}
          onPointerDown={(event) => handleHandlePointerDown(event, "max")}
          onPointerMove={(event) => handleHandlePointerMove(event, "max")}
        />
        <input
          type="range"
          min="0"
          max={tierRankOptions.length - 1}
          step="1"
          value={minValue}
          aria-label="최소 티어"
          onChange={(event) => updateMin(event.target.value)}
        />
        <input
          type="range"
          min="0"
          max={tierRankOptions.length - 1}
          step="1"
          value={maxValue}
          aria-label="최대 티어"
          onChange={(event) => updateMax(event.target.value)}
        />
      </div>

      <div className="tier-range-markers">
        {tierMarkers.map((marker) => (
          <button
            className={`tier-range-marker ${
              marker.startIndex >= minValue && marker.endIndex <= maxValue
                ? "is-active"
                : ""
            }`.trim()}
            type="button"
            style={{
              "--marker-position": `${marker.positionPercent}%`,
            }}
            aria-label={`${marker.label} 티어 범위 선택`}
            onClick={() => selectTierGroup(marker)}
            key={marker.tier}
          >
            <TierBadge tier={marker.tier} />
            <span>{marker.label}</span>
          </button>
        ))}
      </div>

      <div className="tier-range-selects">
        <label>
          최소
          <select
            className="input"
            value={String(minValue)}
            aria-label="최소 티어"
            onChange={(event) => updateMin(event.target.value)}
          >
            {tierRankOptions.map((tier, index) => (
              <option value={index} key={tier}>
                {tier}
              </option>
            ))}
          </select>
        </label>
        <label>
          최대
          <select
            className="input"
            value={String(maxValue)}
            aria-label="최대 티어"
            onChange={(event) => updateMax(event.target.value)}
          >
            {tierRankOptions.map((tier, index) => (
              <option value={index} key={tier}>
                {tier}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

export default TierRangeSlider;
