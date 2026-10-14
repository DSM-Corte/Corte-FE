import { useEffect, useMemo, useRef, useState } from "react";
import Button from "../common/Button";

function TagDropdown({ options, selectedTags, onAddTag, onRemoveTag }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const searchInputRef = useRef(null);
  const availableTags = useMemo(
    () =>
      options.filter((tag) => {
        const isSelected = selectedTags.includes(tag);
        const isMatched = tag
          .toLowerCase()
          .includes(searchKeyword.trim().toLowerCase());

        return !isSelected && isMatched;
      }),
    [options, searchKeyword, selectedTags],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
  }, [isOpen]);

  function selectTag(tag) {
    onAddTag(tag);
    setIsOpen(false);
    setSearchKeyword("");
  }

  return (
    <div className="tag-select">
      <Button
        variant="pearl"
        size="small"
        type="button"
        className="tag-select__trigger"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        태그 선택
        <span aria-hidden="true"> ↓ </span>
      </Button>

      {isOpen && (
        <div className="tag-select__menu">
          <label className="tag-select__search">
            <span>태그 검색</span>
            <input
              type="search"
              value={searchKeyword}
              placeholder="태그 이름을 입력하세요"
              ref={searchInputRef}
              onChange={(event) => setSearchKeyword(event.target.value)}
            />
          </label>

          <div className="tag-select__options" role="listbox" aria-label="태그 목록">
          {availableTags.length > 0 ? (
            availableTags.map((tag) => (
              <button
                type="button"
                className="tag-select__option"
                role="option"
                onClick={() => selectTag(tag)}
                key={tag}
              >
                {tag}
              </button>
            ))
          ) : (
            <p className="tag-select__empty">
              {searchKeyword ? "검색 결과가 없습니다." : "선택 가능한 태그가 없습니다."}
            </p>
          )}
          </div>
        </div>
      )}

      {selectedTags.length > 0 && (
        <div className="tag-chip-list" aria-label="선택한 태그">
          {selectedTags.map((tag) => (
            <span className="tag-chip" key={tag}>
              {tag}
              <button
                type="button"
                aria-label={`${tag} 태그 제거`}
                onClick={() => onRemoveTag(tag)}
              >
                x
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default TagDropdown;
