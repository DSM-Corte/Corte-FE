import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const { getProblemList } = await server.ssrLoadModule('/src/api/ProblemApi.js');
const { createDefaultFilters } = await server.ssrLoadModule('/src/components/problems/problemListConfig.js');
const originalFetch = globalThis.fetch;
globalThis.window = { localStorage: { getItem: () => null, removeItem() {} }, sessionStorage: { getItem: () => null, removeItem() {} } };
globalThis.document = { cookie: '' };
after(async () => { globalThis.fetch = originalFetch; delete globalThis.window; delete globalThis.document; await server.close(); });

const problem = (id, difficulty = 'BRONZE_5') => ({ id, title: `문제 ${id}`, difficulty, tags: ['배열'] });
const options = (extra = {}) => ({ ...createDefaultFilters(), serverCatalog: [], sortKey: 'id', sortDirection: 'desc', page: 1, pageSize: 5, ...extra });
const reply = (content, totalElements = content.length, page = 0, size = 5) => new Response(JSON.stringify({ content, totalElements, page, size, totalPages: Math.ceil(totalElements / size) }), { status: 200 });

test('등급·해결 상태를 서버 쿼리에 함께 전달하고 서버 총 개수로 페이징한다', async () => {
  let query;
  globalThis.fetch = async (path) => { query = new URL(path, 'http://localhost').searchParams; return reply([problem(9)], 12, 1); };
  const result = await getProblemList(options({ difficultyTier: 'BRONZE', status: 'solved', page: 2 }));
  assert.equal(query.get('difficultyTier'), 'BRONZE');
  assert.equal(query.get('solveStatus'), 'SOLVED');
  assert.equal(query.get('page'), '1');
  assert.equal(result.totalCount, 12);
  assert.equal(result.totalPages, 3);
  assert.equal(result.startIndex, 6);
  assert.equal(result.items[0].solved, true);
});

test('미해결 응답은 브라우저에 남은 정답 기록으로 제거하지 않는다', async () => {
  globalThis.fetch = async () => reply([problem(1)]);
  const result = await getProblemList(options({ status: 'unsolved', serverCatalog: [{ id: 1, solved: true }] }));
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].solved, false);
});

test('미지정과 빈 결과를 유지한다', async () => {
  globalThis.fetch = async (path) => { assert.equal(new URL(path, 'http://localhost').searchParams.get('difficultyTier'), 'UNRATED'); return reply([]); };
  const result = await getProblemList(options({ difficultyTier: 'UNRATED' }));
  assert.equal(result.totalCount, 0);
  assert.equal(result.startIndex, 0);
  assert.equal(result.totalPages, 1);
});

test('키워드 조합에서도 서버 상태 필터를 전달하고 모든 서버 페이지를 읽는다', async () => {
  const pages = [];
  globalThis.fetch = async (path) => {
    const query = new URL(path, 'http://localhost').searchParams;
    assert.equal(query.get('solveStatus'), 'UNSOLVED');
    pages.push(query.get('page'));
    return reply([problem(Number(query.get('page')) + 1)], 101, Number(query.get('page')), 100);
  };
  const result = await getProblemList(options({ keyword: '문제', status: 'unsolved' }));
  assert.deepEqual(pages, ['0', '1']);
  assert.equal(result.items.length, 2);
});

test('서버 인증 오류는 빈 결과로 바꾸지 않고 전달한다', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ code: 'A001', message: '인증이 필요합니다.' }), { status: 401 });
  await assert.rejects(getProblemList(options({ status: 'solved' })), (error) => error.status === 401 && error.code === 'A001');
});

test('단일 태그도 기존 부분 문자열과 대소문자 무시 검색을 유지한다', async () => {
  globalThis.fetch = async (path) => {
    assert.equal(new URL(path, 'http://localhost').searchParams.has('tag'), false);
    return reply([{ ...problem(1), tags: ['DP 심화'] }, { ...problem(2), tags: ['배열'] }]);
  };
  const result = await getProblemList(options({ selectedTags: ['dp'] }));
  assert.deepEqual(result.items.map((item) => item.id), [1]);
});
