import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, JobStatus, Night } from './types.js';

type Entry = { at: string; job: string; status: JobStatus; owner: string | null; error: string | null };

const STATUSES: readonly string[] = ['ok', 'retry', 'fail'];

// Parse one line at the edge; anything that is not a full entry is a bad line.
function parseLine(line: string): Entry | null {
  let v: unknown;
  try {
    v = JSON.parse(line);
  } catch {
    return null;
  }
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.at !== 'string' || typeof o.job !== 'string' || typeof o.status !== 'string') return null;
  if (!STATUSES.includes(o.status)) return null;
  return {
    at: o.at,
    job: o.job,
    status: o.status as JobStatus,
    owner: typeof o.owner === 'string' ? o.owner : null,
    error: typeof o.error === 'string' ? o.error : null,
  };
}

// Reads runs/<night>.jsonl into one row per job, sorted by job. A night with no file is null.
export function readNight(runsDir: string, night: string): Night | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return null;
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null;
  }
  const byJob = new Map<string, DigestRow>();
  let badLines = 0;
  const counts: Record<JobStatus, number> = { ok: 0, retry: 0, fail: 0 };
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    const e = parseLine(line);
    if (!e) {
      badLines++;
      continue;
    }
    counts[e.status]++;
    const row = byJob.get(e.job);
    if (!row) {
      byJob.set(e.job, {
        job: e.job,
        owner: e.owner,
        runs: 1,
        retries: e.status === 'retry' ? 1 : 0,
        lastStatus: e.status,
        lastError: e.error,
        firstAt: e.at,
        lastAt: e.at,
      });
      continue;
    }
    row.runs++;
    if (e.status === 'retry') row.retries++;
    row.lastStatus = e.status;
    row.lastError = e.error;
    row.lastAt = e.at;
    row.owner = e.owner ?? row.owner;
  }
  const rows = [...byJob.values()].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
  return { night, rows, badLines, counts };
}
