import ProblemExampleList from "./ProblemExampleList";

const sectionHeading = /^\s*(?:#{1,6}[ \t]+)?(문제 설명|문제|입력 설명|입력 형식|입력|출력 설명|출력 형식|출력|예제(?:[ \t]*(?:입력|출력))?(?:[ \t]*\d+)?)[ \t]*[:：]?[ \t]*$/;
const fencedSample = /^ {0,3}(`{3,}|~{3,})[^\n]*\n([\s\S]*?)\n {0,3}\1[ \t]*$/;

function splitStatement(description) {
  const sections = [];
  let title = "문제 설명";
  let lines = [];
  let fence;

  function addSection() {
    const body = lines.join("\n").replace(/^\n+|\n+$/g, "");
    if (body.trim()) sections.push({ title, body });
  }

  for (const line of description.split(/\r\n?|\n/)) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1].startsWith(fence) && !marker[2].trim()) fence = undefined;
      lines.push(line);
      continue;
    }

    const heading = !fence && line.match(sectionHeading);
    if (heading) {
      addSection();
      title = heading[1] === "문제" ? "문제 설명" : heading[1];
      lines = [];
    } else {
      lines.push(line);
    }
  }

  addSection();
  return sections;
}

function ProblemStatement({ description }) {
  const examples = new Map();
  const sections = splitStatement(description).filter(({ title, body }) => {
    const match = title.match(/^예제[ \t]*(입력|출력)?[ \t]*(\d+)?$/);
    if (!match) return true;

    const [, kind, number = "1"] = match;
    const example = examples.get(number) ?? { title: `예제 ${number}` };
    const field = kind === "입력" ? "input" : kind === "출력" ? "output" : "text";
    const value = body.match(fencedSample)?.[2] ?? body;
    example[field] = example[field] === undefined ? value : `${example[field]}\n\n${value}`;
    examples.set(number, example);
    return false;
  });

  return (
    <>
      {sections.map(({ title, body }, index) => (
        <section className="problem-detail__section" key={index}>
          <h2>{title}</h2>
          <p className="problem-detail__text">{body}</p>
        </section>
      ))}
      {examples.size > 0 && (
        <section className="problem-detail__section">
          <h2>예제</h2>
          <ProblemExampleList examples={[...examples.values()]} />
        </section>
      )}
    </>
  );
}

export default ProblemStatement;
