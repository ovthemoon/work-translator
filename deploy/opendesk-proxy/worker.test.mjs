import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.js';
const env = { ORIGIN: 'https://origin.example', PROXY_SECRET: 'fake-test-only' };
test('double slash paths cannot change the upstream host', async t => {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async req => { requests.push(req); return new Response('ok'); });
  for (const path of ['//other.example/path', '/normal?q=one', '/%2f%2fother.example']) {
    await worker.fetch(new Request('https://public.example' + path), env);
  }
  assert.ok(requests.every(r => new URL(r.url).origin === env.ORIGIN));
  assert.ok(requests.every(r => r.headers.get('x-proxy-secret') === env.PROXY_SECRET));
});
test('only exact upstream origins are rewritten on redirects', async t => {
  let location = 'https://origin.example.evil.test/path';
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 302, headers: { location } }));
  let res = await worker.fetch(new Request('https://public.example/a'), env);
  assert.equal(res.headers.get('location'), location);
  location = '/next?q=1';
  res = await worker.fetch(new Request('https://public.example/a'), env);
  assert.equal(res.headers.get('location'), 'https://public.example/next?q=1');
});
