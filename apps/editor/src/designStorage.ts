import { Design } from "@card-studio/scene-schema";

export interface DesignSummary {
  id: string;
  name: string;
  updatedAt: string;
}

/**
 * Where saved designs live — deliberately small and swappable. Today
 * `localStorageDesignStorage` is the only implementation (this app has no
 * backend of its own yet — see README's "Not built yet"), but every
 * consumer (DesignLibraryModal.tsx) only ever talks to this interface, so
 * plugging in a real moxproxies-website-backed API later (list/save/load/
 * remove against a `CardDesign` row instead of localStorage) is a
 * drop-in replacement: swap what `designStorage` below is assigned to,
 * touch nothing else. `Design.parse()` on load is what makes a save from
 * an older version of this app (missing a field a newer schema added)
 * still load cleanly either way — same defaulting behavior the embed's
 * `initial-design` attribute and the render service's request body
 * already rely on.
 */
export interface DesignStorage {
  list(): DesignSummary[];
  load(id: string): Design | undefined;
  /** Upserts by `design.id` — saving a design twice updates the same
   * record rather than creating a second one. */
  save(design: Design): DesignSummary;
  remove(id: string): void;
}

const STORAGE_KEY = "card-studio:designs:v1";

interface StoredRecord {
  updatedAt: string;
  design: Design;
}

function readAll(): Record<string, StoredRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, StoredRecord>) : {};
  } catch {
    // Corrupt or inaccessible (private browsing, quota, ...) — treat as empty
    // rather than throwing, same spirit as embed.ts's invalid-attribute fallback.
    return {};
  }
}

function writeAll(records: Record<string, StoredRecord>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export const localStorageDesignStorage: DesignStorage = {
  list() {
    return Object.values(readAll())
      .map(({ design, updatedAt }) => ({ id: design.id, name: design.name, updatedAt }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  load(id) {
    const record = readAll()[id];
    if (!record) return undefined;
    try {
      return Design.parse(record.design);
    } catch {
      return undefined;
    }
  },

  save(design) {
    const records = readAll();
    const updatedAt = new Date().toISOString();
    records[design.id] = { updatedAt, design };
    writeAll(records);
    return { id: design.id, name: design.name, updatedAt };
  },

  remove(id) {
    const records = readAll();
    delete records[id];
    writeAll(records);
  },
};

/** The storage implementation the app actually uses — see DesignStorage's
 * doc comment for how this gets swapped for a real backend later. */
export const designStorage: DesignStorage = localStorageDesignStorage;
