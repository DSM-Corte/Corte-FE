import Button from "../common/Button";
import Input from "../common/Input";

function ProblemSearchForm({ value, onChange, onSubmit }) {
  return (
    <form className="problem-search" role="search" onSubmit={onSubmit}>
      <span aria-hidden="true">⌕</span>
      <Input
        className="problem-search__input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="문제 검색"
        placeholder="문제 번호, 제목, 태그를 검색하세요"
      />
      <Button variant="primary" size="medium" type="submit">
        검색
      </Button>
    </form>
  );
}

export default ProblemSearchForm;
