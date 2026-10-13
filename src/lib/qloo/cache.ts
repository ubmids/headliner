import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Two-level cache: in-process LRU in front of a JSON file per key on disk.
 * Qloo allows private server-side caching with no time limit; the directory
 * (DATA_DIR) is gitignored so real Qloo data never lands in the public repo.
 */
export class JsonCache {
  private mem = new Map<string, unknown>();

  constructor(
    private dir: string | null,
    private maxEntries = 2000,
  ) {}

  private file(key: string): string | null {
    if (!this.dir) return null;
    const h = createHash("sha256").update(key).digest("hex").slice(0, 32);
    return path.join(this.dir, `${h}.json`);
  }

  async get<T>(key: string): Promise<T | undefined> {
    if (this.mem.has(key)) {
      const v = this.mem.get(key) as T;
      this.mem.delete(key);
      this.mem.set(key, v);
      return v;
    }
    const f = this.file(key);
    if (!f) return undefined;
    try {
      const raw = JSON.parse(await fs.readFile(f, "utf8")) as { key: string; value: T };
      if (raw.key !== key) return undefined;
      this.remember(key, raw.value);
      return raw.value;
    } catch {
      return undefined;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.remember(key, value);
    const f = this.file(key);
    if (!f) return;
    try {
      await fs.mkdir(path.dirname(f), { recursive: true });
      const tmp = `${f}.${process.pid}.tmp`;
      await fs.writeFile(tmp, JSON.stringify({ key, savedAt: new Date().toISOString(), value }));
      await fs.rename(tmp, f);
    } catch {
      // Disk cache is best effort; the in-memory copy still serves this process.
    }
  }

  private remember(key: string, value: unknown) {
    this.mem.set(key, value);
    while (this.mem.size > this.maxEntries) {
      const oldest = this.mem.keys().next().value as string;
      this.mem.delete(oldest);
    }
  }
}
