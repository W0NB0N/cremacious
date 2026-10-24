import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { HistoryPoint, Snapshot } from './types';

const empty = (): Snapshot => ({ updatedAt: null, lastCycle: null, offers: {} });

/** Latest state as one JSON file, plus an append-only history of every accepted price change. */
export class Store {
  private snapshotPath: string;
  private historyPath: string;

  constructor(dir: string) {
    mkdirSync(dir, { recursive: true });
    this.snapshotPath = join(dir, 'snapshot.json');
    this.historyPath = join(dir, 'history.jsonl');
  }

  load(): Snapshot {
    if (!existsSync(this.snapshotPath)) return empty();
    try {
      return JSON.parse(readFileSync(this.snapshotPath, 'utf8')) as Snapshot;
    } catch {
      // A corrupt snapshot must not stop the server; the next cycle rebuilds it.
      return empty();
    }
  }

  /** Write to a temp file, then rename, so a crash never leaves half a file. */
  save(snapshot: Snapshot) {
    const tmp = `${this.snapshotPath}.tmp`;
    writeFileSync(tmp, JSON.stringify(snapshot, null, 2));
    renameSync(tmp, this.snapshotPath);
  }

  appendHistory(points: HistoryPoint[]) {
    if (points.length) appendFileSync(this.historyPath, points.map((p) => JSON.stringify(p)).join('\n') + '\n');
  }

  history(productId: string, limit: number): HistoryPoint[] {
    if (!existsSync(this.historyPath)) return [];
    const points: HistoryPoint[] = [];
    for (const line of readFileSync(this.historyPath, 'utf8').split('\n')) {
      if (!line) continue;
      try {
        const p = JSON.parse(line) as HistoryPoint;
        if (p.productId === productId) points.push(p);
      } catch { /* skip a damaged line */ }
    }
    return points.slice(-limit);
  }
}
