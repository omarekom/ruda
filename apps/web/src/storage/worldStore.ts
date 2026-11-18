import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { newId } from './newId';

/** A saved world; `data` is the world as `.ruda` text. */
export interface StoredWorld {
  readonly id: string;
  readonly name: string;
  readonly data: string;
  /** When it was last saved, or created. */
  readonly updatedAt: number;
  /** When it was last opened or saved; missing in worlds stored before it was kept. */
  readonly playedAt?: number;
}

/** When the world was last played, as far as is known. */
export function lastPlayedAt(world: Pick<StoredWorld, 'updatedAt' | 'playedAt'>): number {
  return world.playedAt ?? world.updatedAt;
}

export type WorldSummary = Omit<StoredWorld, 'data'>;

/** An autosaved copy of unsaved changes, kept apart from the world's real save. */
export interface Recovery {
  readonly id: string;
  readonly data: string;
  readonly savedAt: number;
}

interface RudaDB extends DBSchema {
  worlds: { key: string; value: StoredWorld };
  recovery: { key: string; value: Recovery };
}

const DB_NAME = 'ruda';
const DB_VERSION = 1;

/** Worlds and their recovery copies in IndexedDB. */
export class WorldStore {
  private constructor(private readonly db: IDBPDatabase<RudaDB>) {}

  static async open(): Promise<WorldStore> {
    const db = await openDB<RudaDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        database.createObjectStore('worlds', { keyPath: 'id' });
        database.createObjectStore('recovery', { keyPath: 'id' });
      },
    });
    return new WorldStore(db);
  }

  /** All worlds, most recently played first. */
  async list(): Promise<WorldSummary[]> {
    const worlds = await this.db.getAll('worlds');
    return worlds
      .map(({ id, name, updatedAt, playedAt }): WorldSummary =>
        playedAt === undefined ? { id, name, updatedAt } : { id, name, updatedAt, playedAt },
      )
      .sort((a, b) => lastPlayedAt(b) - lastPlayedAt(a));
  }

  load(id: string): Promise<StoredWorld | undefined> {
    return this.db.get('worlds', id);
  }

  async create(name: string, data: string): Promise<StoredWorld> {
    const world: StoredWorld = { id: newId(), name, data, updatedAt: Date.now() };
    await this.db.add('worlds', world);
    return world;
  }

  /** Saves the world and drops its recovery copy, which the save supersedes. */
  async save(id: string, name: string, data: string): Promise<void> {
    const now = Date.now();
    const tx = this.db.transaction(['worlds', 'recovery'], 'readwrite');
    await Promise.all([
      tx.objectStore('worlds').put({ id, name, data, updatedAt: now, playedAt: now }),
      tx.objectStore('recovery').delete(id),
      tx.done,
    ]);
  }

  /** Notes that the world was just opened, for sorting and showing when it was last played. */
  async markPlayed(id: string): Promise<void> {
    const world = await this.db.get('worlds', id);
    if (world) await this.db.put('worlds', { ...world, playedAt: Date.now() });
  }

  /** Renames without touching the save time or the recovery copy. */
  async rename(id: string, name: string, data: string): Promise<void> {
    const world = await this.db.get('worlds', id);
    if (world) await this.db.put('worlds', { ...world, name, data });
  }

  async delete(id: string): Promise<void> {
    const tx = this.db.transaction(['worlds', 'recovery'], 'readwrite');
    await Promise.all([
      tx.objectStore('worlds').delete(id),
      tx.objectStore('recovery').delete(id),
      tx.done,
    ]);
  }

  async saveRecovery(id: string, data: string): Promise<void> {
    await this.db.put('recovery', { id, data, savedAt: Date.now() });
  }

  loadRecovery(id: string): Promise<Recovery | undefined> {
    return this.db.get('recovery', id);
  }

  discardRecovery(id: string): Promise<void> {
    return this.db.delete('recovery', id);
  }
}
