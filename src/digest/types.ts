export type JobStatus = 'ok' | 'retry' | 'fail';

// One row per job in a night's run log. Times keep the offset from the log (styleguide).
export type DigestRow = {
  job: string;
  owner: string | null; // null in the log; views show it as —
  runs: number;
  retries: number;
  lastStatus: JobStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type Night = {
  night: string; // YYYY-MM-DD
  rows: DigestRow[]; // sorted by job
  badLines: number; // lines that did not parse, counted and never thrown
};

// Returns null when runs/<night>.jsonl does not exist.
export type ReadNight = (runsDir: string, night: string) => Night | null;
