import { clearAuthSession, getAuthToken } from "./AuthApi";

export class ApiError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const TOKEN_ERROR_CODES = ["A001", "A002", "A003"];

async function readBody(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function request(path, { method = "GET", body, headers = {} } = {}) {
  const token = getAuthToken();
  const requestHeaders = { Accept: "application/json", ...headers };

  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(path, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("서버에 연결할 수 없습니다.", { code: "NETWORK_ERROR" });
  }

  const data = await readBody(response);

  if (response.ok) {
    return data;
  }

  // 만료·위조 토큰(A001~A003)만 세션을 지운다. 로그인 실패(U002) 같은 401은 세션과 무관하다
  if (response.status === 401 && token && TOKEN_ERROR_CODES.includes(data?.code)) {
    clearAuthSession();
  }

  throw new ApiError(
    data?.message ??
      (response.status >= 500
        ? "서버에 연결할 수 없습니다."
        : "요청을 처리하지 못했습니다."),
    { status: response.status, code: data?.code },
  );
}
