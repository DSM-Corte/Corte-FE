import Input from "../common/Input";

function clamp(value, min, max) {
  return Math.min(Math.max(Number(value), min), max);
}

function getDecimalPlaces(value) {
  const [, decimal = ""] = String(value).split(".");
  return decimal.length;
}

function snapToStep(value, range) {
  const step = Number(range.step) || 1;
  const decimalPlaces = getDecimalPlaces(step);
  const steppedValue =
    range.min + Math.round((Number(value) - range.min) / step) * step;

  return clamp(Number(steppedValue.toFixed(decimalPlaces)), range.min, range.max);
}

function formatRangeValue(value, unit) {
  if (unit === "명") {
    return `${Number(value).toLocaleString()}명`;
  }

  if (unit === "문제") {
    return `${Number(value).toLocaleString()}문제`;
  }

  return `${Number(value).toFixed(1)}회`;
}

function getMarkerPercent(marker, range) {
  if (typeof marker.positionPercent === "number") {
    return marker.positionPercent;
  }

  const { value } = marker;

  return ((Number(value) - range.min) / (range.max - range.min)) * 100;
}

function getValueFromClientX(clientX, sliderElement, range) {
  const rect = sliderElement.getBoundingClientRect();
  const percent = clamp((clientX - rect.left) / rect.width, 0, 1);
  const rawValue = range.min + percent * (range.max - range.min);

  return snapToStep(rawValue, range);
}

function RangeSlider({
  label,
  minKey,
  maxKey,
  filters,
  range,
  unit,
  markers = [],
  updateFilter,
}) {
  const minValue = clamp(filters[minKey], range.min, range.max);
  const maxValue = clamp(filters[maxKey], range.min, range.max);
  const minPercent = ((minValue - range.min) / (range.max - range.min)) * 100;
  const maxPercent = ((maxValue - range.min) / (range.max - range.min)) * 100;

  function updateMin(value) {
    const nextValue = Math.min(snapToStep(value, range), maxValue);
    updateFilter(minKey, String(nextValue));
  }

  function updateMax(value) {
    const nextValue = Math.max(snapToStep(value, range), minValue);
    updateFilter(maxKey, String(nextValue));
  }

  function moveNearestHandle(value) {
    const nextValue = snapToStep(value, range);
    const minDistance = Math.abs(nextValue - minValue);
    const maxDistance = Math.abs(nextValue - maxValue);

    if (nextValue < minValue || minDistance <= maxDistance) {
      updateMin(nextValue);
      return;
    }

    updateMax(nextValue);
  }

  function handleTrackPointerDown(event) {
    moveNearestHandle(getValueFromClientX(event.clientX, event.currentTarget, range));
  }

  function updateHandleFromPointer(event, handle) {
    const sliderElement = event.currentTarget.closest(".range-slider");
    const nextValue = getValueFromClientX(event.clientX, sliderElement, range);

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

  return (
    <div className="range-control">
      <div className="range-control__values">
        <span>{formatRangeValue(minValue, unit)}</span>
        <span>{formatRangeValue(maxValue, unit)}</span>
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
          aria-label={`${label} 슬라이더 위치 이동`}
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
          min={range.min}
          max={range.max}
          step={range.step}
          value={minValue}
          aria-label={`${label} 최소값`}
          onChange={(event) => updateMin(event.target.value)}
        />
        <input
          type="range"
          min={range.min}
          max={range.max}
          step={range.step}
          value={maxValue}
          aria-label={`${label} 최대값`}
          onChange={(event) => updateMax(event.target.value)}
        />
      </div>

      {markers.length > 0 && (
        <div className="range-markers">
          {markers.map((marker) => (
            <button
              className="range-marker"
              type="button"
              style={{
                "--marker-position": `${getMarkerPercent(marker, range)}%`,
              }}
              aria-label={`${label} ${marker.label} 기준으로 이동`}
              onClick={() => moveNearestHandle(marker.value)}
              key={`${marker.value}-${marker.label}`}
            >
              <span className="range-marker__dot" aria-hidden="true" />
              <span className="range-marker__label">{marker.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="range-inputs">
        <Input
          value={filters[minKey]}
          onChange={(event) => updateMin(event.target.value)}
          inputMode="decimal"
          aria-label={`${label} 최소 입력`}
        />
        <span>...</span>
        <Input
          value={filters[maxKey]}
          onChange={(event) => updateMax(event.target.value)}
          inputMode="decimal"
          aria-label={`${label} 최대 입력`}
        />
      </div>
    </div>
  );
}

export default RangeSlider;
