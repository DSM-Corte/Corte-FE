import { getProblemCatalog } from "./ProblemApi";

const problemUrl = `${(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "")}/api/problems`;

function toProblem(response) {
  return {
    ...response,
    tags: response.tags ?? [],
    tier: response.difficulty
      .toLowerCase()
      .replace(/^[a-z]/, (letter) => letter.toUpperCase())
      .replace("_", " "),
  };
}

export async function fetchProblemCatalog(signal) {
  const problems = [];
  let page = 0;
  let totalPages;

  // Search, multi-tag filters, and sorting operate on the full catalog.
  do {
    const response = await fetch(`${problemUrl}?page=${page}&size=100`, { signal });
    if (!response.ok) throw new Error(`Problem list: ${response.status}`);
    const data = await response.json();
    problems.push(...data.content.map(toProblem));
    totalPages = data.totalPages;
    page += 1;
  } while (page < totalPages);

  return problems;
}

export async function fetchProblemDetail(id, signal) {
  const response = await fetch(`${problemUrl}/${encodeURIComponent(id)}`, { signal });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Problem detail: ${response.status}`);
  return toProblem(await response.json());
}

export async function applyLocalProblemProgress(problems) {
  const localProblems = await getProblemCatalog();
  const localById = new Map(localProblems.map((problem) => [problem.id, problem]));

  return problems.map((problem) => {
    const local = localById.get(problem.id);
    const supportsLocalSubmission = local?.title === problem.title;
    return {
      ...problem,
      supportsLocalSubmission,
      solved: supportsLocalSubmission && local.solved,
      attempted: supportsLocalSubmission && local.attempted,
    };
  });
}
