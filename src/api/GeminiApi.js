const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

function getEnvValue(key) {
  return String(import.meta.env?.[key] ?? "").trim();
}

function stripJsonFence(text) {
  return String(text ?? "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function parseGeminiJson(text) {
  const strippedText = stripJsonFence(text);

  try {
    return JSON.parse(strippedText);
  } catch {
    const jsonMatch = strippedText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("Gemini 응답을 JSON으로 해석할 수 없습니다.");
    }

    return JSON.parse(jsonMatch[0]);
  }
}

function clampLineNumber(line, maxLine) {
  const nextLine = Number(line);

  if (!Number.isFinite(nextLine)) {
    return 1;
  }

  return Math.min(Math.max(Math.round(nextLine), 1), maxLine);
}

function buildReviewPrompt({ submission, description }) {
  return [
    "너는 알고리즘 풀이 코드 리뷰어다.",
    "응답은 반드시 한국어 JSON 객체 하나로만 작성한다.",
    "마크다운 코드펜스나 설명 문장은 쓰지 않는다.",
    "스키마:",
    "{",
    '  "summary": "전체 리뷰 요약",',
    '  "comments": [{"line": 1, "body": "라인 코멘트"}],',
    '  "suggestion": {"title": "개선 제안 제목", "description": "제안 설명", "code": "개선된 전체 코드 또는 핵심 패치"}',
    "}",
    "라인 코멘트는 최대 4개로 제한하고, 실제 코드 줄 번호를 사용한다.",
    "동작을 바꾸는 수정은 근거가 분명할 때만 제안한다.",
    "",
    `문제: ${submission.problemTitle}`,
    `언어: ${submission.language}`,
    `실행 시간: ${submission.runtimeMs}ms`,
    `메모리: ${(submission.memoryKb / 1024).toFixed(1)} MB`,
    "",
    "작성자 설명:",
    description,
    "",
    "제출 코드:",
    "```",
    submission.code,
    "```",
  ].join("\n");
}

function getGeminiModelCandidates() {
  return [getGeminiModel(), ...GEMINI_FALLBACK_MODELS].filter(
    (model, index, models) => model && models.indexOf(model) === index,
  );
}

function shouldTryNextModel(error) {
  return [404, 429, 503].includes(error.status);
}

async function requestGeminiGenerateContent({ apiKey, model, prompt }) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.25,
        },
      }),
    },
  );

  if (!response.ok) {
    const error = new Error(`Gemini 호출에 실패했습니다. (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

function normalizeGeminiReviewPayload(payload, submission) {
  const now = new Date().toISOString();
  const codeLines = String(submission.code ?? "").split("\n");
  const maxLine = Math.max(codeLines.length, 1);
  const comments = Array.isArray(payload.comments) ? payload.comments : [];
  const suggestion = payload.suggestion ?? {};
  const suggestionCode = String(suggestion.code ?? "").trim() || submission.code;

  return {
    source: "gemini",
    summary:
      String(payload.summary ?? "").trim() ||
      "제출 코드를 바탕으로 리뷰를 생성했습니다.",
    comments: comments.slice(0, 4).map((comment, index) => ({
      id: `gemini-comment-${Date.now()}-${index + 1}`,
      authorType: "ai",
      authorName: "COTRE Review",
      line: clampLineNumber(comment.line, maxLine),
      body: String(comment.body ?? "").trim(),
      createdAt: now,
    })).filter((comment) => comment.body),
    suggestions: [
      {
        id: `gemini-suggestion-${Date.now()}`,
        authorType: "ai",
        authorId: "ai-gemini",
        authorName: "COTRE Review",
        title: String(suggestion.title ?? "").trim() || "개선 제안",
        description:
          String(suggestion.description ?? "").trim() ||
          "제출 코드를 바탕으로 생성한 개선 제안입니다.",
        code: suggestionCode,
        recommendedBy: [],
        recommendationCount: 0,
        createdAt: now,
      },
    ],
  };
}

export function getGeminiApiKey() {
  return getEnvValue("VITE_GEMINI_API_KEY") || getEnvValue("VITE_GOOGLE_API_KEY");
}

export function getGeminiModel() {
  return getEnvValue("VITE_GEMINI_MODEL") || DEFAULT_GEMINI_MODEL;
}

export async function generateGeminiCodeReview({ submission, description }) {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new Error("Gemini API 키가 없습니다.");
  }

  const prompt = buildReviewPrompt({ submission, description });
  const models = getGeminiModelCandidates();
  let lastError;

  for (const model of models) {
    try {
      const data = await requestGeminiGenerateContent({ apiKey, model, prompt });
      const text = (data.candidates?.[0]?.content?.parts ?? [])
        .map((part) => part.text ?? "")
        .join("")
        .trim();

      if (!text) {
        throw new Error("Gemini 응답이 비어 있습니다.");
      }

      return normalizeGeminiReviewPayload(parseGeminiJson(text), submission);
    } catch (error) {
      lastError = error;

      if (!shouldTryNextModel(error)) {
        break;
      }
    }
  }

  throw lastError ?? new Error("Gemini 호출에 실패했습니다.");
}
