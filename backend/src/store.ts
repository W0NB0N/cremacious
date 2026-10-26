import { appendFileSync, closeSync, existsSync, fstatSync, mkdirSync, openSync, readFileSync, readSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { HistoryPoint, Snapshot } from './types';

const empty = (): Snapshot => ({ updatedAt: null, lastCycle: null, offers: {} });
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const processAlive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM';
  }
};

/** Latest state as one JSON file, plus an append-only history of every accepted price change. */
export class Store {
  private snapshotPath: string;
  private historyPath: string;
  private lockPath: string;

  constructor(dir: string) {
    mkdirSync(dir, { recursive: true });
    this.snapshotPath = join(dir, 'snapshot.json');
    this.historyPath = join(dir, 'history.jsonl');
    this.lockPath = join(dir, 'poll.lock');
  }

  load(): Snapshot {
    if (!existsSync(this.snapshotPath)) return empty();
    try {
      const raw: unknown = JSON.parse(readFileSync(this.snapshotPath, 'utf8'));
      // Valid JSON of the wrong shape ({} / null / []) is as bad as corrupt JSON: every route would read off it.
      if (!isRecord(raw) || !isRecord(raw.offers)) return empty();
      return { updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null, lastCycle: isRecord(raw.lastCycle) ? (raw.lastCycle as Snapshot['lastCycle']) : null, offers: raw.offers as Snapshot['offers'] };
    } catch {
      // A corrupt snapshot must not stop the server; the next cycle rebuilds it.
      return empty();
    }
  }

  /**
   * Only one poll cycle may write this store at a time (two would duplicate history rows and race the snapshot).
   * Exclusive-create a lock file holding our pid; a lock whose process is gone is taken over.
   * Returns the release function. Gap: a recycled pid can make a dead owner look alive until it is freed.
   */
  acquireLock(): () => void {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        writeFileSync(this.lockPath, String(process.pid), { flag: 'wx' });
        return () => { try { unlinkSync(this.lockPath); } catch { /* already gone */ } };
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
        const owner = Number(readFileSync(this.lockPath, 'utf8'));
        if (Number.isInteger(owner) && processAlive(owner)) throw new Error('a poll cycle is already running on this store');
        try { unlinkSync(this.lockPath); } catch { /* another process took it over first */ }
      }
    }
    throw new Error('a poll cycle is already running on this store');
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
    // Read backwards in chunks and stop once `limit` rows match, so a request costs the size of its answer,
    // not the size of the file (the file is never rotated, and this runs on the event loop).
    const fd = openSync(this.historyPath, 'r');
    const found: HistoryPoint[] = [];
    try {
      const CHUNK = 64 * 1024;
      let pos = fstatSync(fd).size;
      let tail = Buffer.alloc(0); // bytes of the line that straddles the chunk boundary; kept raw so a split UTF-8 character decodes whole
      while (pos > 0 && found.length < limit) {
        const len = Math.min(CHUNK, pos);
        pos -= len;
        const buf = Buffer.alloc(len);
        readSync(fd, buf, 0, len, pos);
        const data = Buffer.concat([buf, tail]);
        let start = 0;
        if (pos > 0) {
          // The first line in this chunk may have started in the previous one; hold it back until we read that.
          const nl = data.indexOf(0x0a);
          if (nl === -1) { tail = data; continue; }
          tail = data.subarray(0, nl);
          start = nl + 1;
        }
        const lines = data.subarray(start).toString('utf8').split('\n');
        for (let i = lines.length - 1; i >= 0 && found.length < limit; i--) this.collect(lines[i], productId, found);
      }
    } finally {
      closeSync(fd);
    }
    return found.reverse();
  }

  private collect(line: string, productId: string, into: HistoryPoint[]) {
    if (!line) return;
    try {
      const p = JSON.parse(line) as HistoryPoint;
      if (p.productId === productId) into.push(p);
    } catch { /* skip a damaged line */ }
  }
}
