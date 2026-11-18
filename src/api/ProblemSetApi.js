import { isAuthenticated } from "./AuthApi";
import { getMySubmissions } from "./JudgeApi";
import { request } from "./apiClient";

async function readPages(path, selectPage = (response) => response) {
  const items = [];
  let page = 0;
  let totalPages;
  do {
    const response = selectPage(await request(`${path}?page=${page}&size=100`));
    items.push(...response.content);
    totalPages = response.totalPages;
    page += 1;
  } while (page < totalPages);
  return items;
}

export async function getCustomProblemSet(id) {
  if (!/^\d+$/.test(id)) return null;
  const problems = await readPages(`/api/workbooks/${id}`, (response) => response.problems);
  return { id: String(id), problemIds: problems.map((problem) => problem.id) };
}

export async function getCustomProblemSets() {
  const workbooks = await readPages("/api/workbooks");
  return Promise.all(workbooks.map(async (workbook) => ({
    ...(await getCustomProblemSet(workbook.id)),
    title: workbook.name,
  })));
}

export function toWorkbookProblem(problem) {
  return {
    ...problem,
    tags: problem.tags ?? [],
    tier: problem.difficulty.toLowerCase().replace(/^./, (letter) => letter.toUpperCase()).replace("_", " "),
  };
}

export async function getWorkbookProblemCatalog() {
  return (await readPages("/api/problems")).map(toWorkbookProblem);
}

export async function getWorkbookCatalogWithProgress() {
  const progress = new Map();

  async function loadProgress() {
    if (!isAuthenticated()) return;

    let page = 0;
    let totalPages;
    do {
      const result = await getMySubmissions({ page, size: 100 });
      for (const { problemId, verdict } of result.content) {
        const id = Number(problemId);
        progress.set(id, verdict === "ACCEPTED" || progress.get(id) === true);
      }
      totalPages = result.totalPages;
      page += 1;
    } while (page < totalPages);
  }

  const [problems] = await Promise.all([getWorkbookProblemCatalog(), loadProgress()]);
  return problems.map((problem) => ({
    ...problem,
    attempted: progress.has(Number(problem.id)),
    solved: progress.get(Number(problem.id)) === true,
  }));
}

export async function createCustomProblemSet({ title, problemIds }) {
  if (!title.trim()) throw new Error("문제집 제목을 입력해주세요.");
  if (!problemIds.length) throw new Error("문제를 1개 이상 선택해주세요.");

  const workbook = await request("/api/workbooks", {
    method: "POST",
    body: { name: title.trim() },
  });
  try {
    for (const problemId of new Set(problemIds.map(Number))) {
      await request(`/api/workbooks/${workbook.id}/problems`, {
        method: "POST",
        body: { problemId },
      });
    }
  } catch (error) {
    try {
      await request(`/api/workbooks/${workbook.id}`, { method: "DELETE" });
    } catch {
      throw new Error("문제 추가에 실패했고 생성된 문제집도 삭제하지 못했습니다.");
    }
    throw error;
  }
  return workbook;
}
