import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const runsDir = mkdtempSync(join(tmpdir(), 'rig-routes-'));
const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir };

beforeAll(() => {
  writeFileSync(
    join(runsDir, '2026-02-01.jsonl'),
    [
      '{"at":"2026-02-01T01:00:00+01:00","job":"b/job","status":"ok","owner":"rook"}',
      '{"at":"2026-02-01T02:00:00+01:00","job":"a/job","status":"fail","owner":null,"error":"boom"}',
    ].join('\n') + '\n',
  );
  writeFileSync(join(runsDir, '2026-02-02.jsonl'), '');
  writeFileSync(
    join(runsDir, '2026-02-03.jsonl'),
    '{"at":"2026-02-03T01:00:00+01:00","job":"x/job","status":"ok","owner":"rook"}\nnot json\n',
  );
});

describe('digest page', () => {
  it('200: rows sorted by job, fail marked, null owner as —', async () => {
    const res = await createApp(config).request('/digest/2026-02-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html.indexOf('a/job')).toBeLessThan(html.indexOf('b/job'));
    expect(html).toContain('a/job ⚠');
    expect(html).toContain('<td>—</td>');
  });
  it('404 for a night with no file', async () => {
    expect((await createApp(config).request('/digest/2026-02-09')).status).toBe(404);
  });
  it('empty night says nothing ran', async () => {
    const res = await createApp(config).request('/digest/2026-02-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });
  it('a bad line is counted, the night still renders', async () => {
    const res = await createApp(config).request('/digest/2026-02-03');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('x/job');
    expect(html).toContain('1 line(s) could not be read');
  });
});

describe('digest json', () => {
  it('200 with rows in the same order as the page', async () => {
    const res = await createApp(config).request('/api/digest/2026-02-01');
    const body = (await res.json()) as { rows: { job: string }[] };
    expect(res.status).toBe(200);
    expect(body.rows.map((r) => r.job)).toEqual(['a/job', 'b/job']);
  });
  it('404 for a night with no file', async () => {
    expect((await createApp(config).request('/api/digest/2026-02-09')).status).toBe(404);
  });
  it('empty night has no rows', async () => {
    const body = (await (await createApp(config).request('/api/digest/2026-02-02')).json()) as { rows: unknown[]; badLines: number };
    expect(body).toMatchObject({ rows: [], badLines: 0 });
  });
  it('bad line is counted', async () => {
    const body = (await (await createApp(config).request('/api/digest/2026-02-03')).json()) as { rows: unknown[]; badLines: number };
    expect(body.badLines).toBe(1);
    expect(body.rows).toHaveLength(1);
  });
});
