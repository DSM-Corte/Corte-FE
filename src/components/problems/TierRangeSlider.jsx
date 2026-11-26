import TierBadge from "./TierBadge";
import { tierRankOptions } from "./problemListConfig";

const tierMarkerLabels = {
  Bronze: "브론즈",
  Silver: "실버",
  Gold: "골드",
  Platinum: "플래티넘",
  Diamond: "다이아",
  Emerald: "에메랄드",
  Master: "마스터",
};

// 목록에 있는 티어 묶음(브론즈, 실버 …)마다 바로가기 표시를 만든다.
// 묶음 범위는 목록에서 그 묶음이 처음·마지막으로 나오는 위치다. 이름표가 없는 묶음(루비, 미지정)은 만들지 않는다
function buildTierMarkers(options) {
  const groups = [];

  options.forEach((tier) => {
    const [tierGroup] = tier.split(" ");

    if (tierMarkerLabels[tierGroup] && !groups.includes(tierGroup)) {
      groups.push(tierGroup);
    }
  });

  return groups.map((tierGroup, markerIndex) => {
    const groupTiers = options.filter((tier) => tier.split(" ")[0] === tierGroup);

    return {
      positionPercent: (markerIndex / Math.max(groups.length - 1, 1)) * 100,
      tier: groupTiers[0],
      label: tierMarkerLabels[tierGroup],
      startIndex: options.indexOf(groupTiers[0]),
      endIndex: options.indexOf(groupTiers[groupTiers.length - 1]),
    };
  });
}

// options: 고를 수 있는 티어 목록. 리더보드는 회원 티어(Bronze 3 ~ Diamond 1)만 넘긴다
function TierRangeSlider({ filters, updateFilter, options = tierRankOptions }) {
  const lastIndex = options.length - 1;
  const tierMarkers = buildTierMarkers(options);

  function clampIndex(value) {
    return Math.round(Math.min(Math.max(Number(value), 0), lastIndex));
  }

  function getIndexFromClientX(clientX, sliderElement) {
    const rect = sliderElement.getBoundingClientRect();
    const percent = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);

    return clampIndex(percent * lastIndex);
  }

  const minValue = clampIndex(filters.tierMinIndex);
  const maxValue = clampIndex(filters.tierMaxIndex);
  const minPercent = (minValue / lastIndex) * 100;
  const maxPercent = (maxValue / lastIndex) * 100;

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
    const isFullRange = minValue === 0 && maxValue === lastIndex;
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
        <span>{options[minValue]}</span>
        <span>{options[maxValue]}</span>
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
          max={lastIndex}
          step="1"
          value={minValue}
          aria-label="최소 티어"
          onChange={(event) => updateMin(event.target.value)}
        />
        <input
          type="range"
          min="0"
          max={lastIndex}
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
            {options.map((tier, index) => (
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
            {options.map((tier, index) => (
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
