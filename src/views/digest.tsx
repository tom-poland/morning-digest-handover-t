import type { DigestRow, Night } from '../digest/types.js';

// Retries of 3 or more and any fail are marked (plan § 2a).
export function isMarked(r: DigestRow): boolean {
  return r.retries >= 3 || r.lastStatus === 'fail';
}

export function DigestPage({ night }: { night: Night }) {
  return (
    <>
      <h1>digest · {night.night}</h1>
      {night.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th><th>owner</th><th>runs</th><th>retries</th><th>last status</th>
              <th>last error</th><th>first</th><th>last</th>
            </tr>
          </thead>
          <tbody>
            {night.rows.map((r) => (
              <tr class={isMarked(r) ? 'warn' : undefined}>
                <td>{r.job}{isMarked(r) ? ' ⚠' : ''}</td>
                <td>{r.owner ?? '—'}</td>
                <td>{r.runs}</td>
                <td>{r.retries}</td>
                <td>{r.lastStatus}</td>
                <td>{r.lastError ?? '—'}</td>
                <td>{r.firstAt}</td>
                <td>{r.lastAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {night.badLines > 0 && <p class="mute">{night.badLines} line(s) could not be read</p>}
    </>
  );
}
