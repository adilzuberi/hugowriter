import { readTextFile, writeTextFile, exists, mkdir, BaseDirectory } from '@tauri-apps/plugin-fs'

const STATE_FILE = 'state.json'
const STATE_DIR_OPTS = { baseDir: BaseDirectory.AppData } as const

export type PersistedState = {
  lastFolder: string | null
  lastFile: string | null
  expandedDirs: string[]
}

export const EMPTY_STATE: PersistedState = {
  lastFolder: null,
  lastFile: null,
  expandedDirs: [],
}

export async function loadState(): Promise<PersistedState> {
  try {
    const present = await exists(STATE_FILE, STATE_DIR_OPTS)
    if (!present) return EMPTY_STATE
    const raw = await readTextFile(STATE_FILE, STATE_DIR_OPTS)
    const parsed = JSON.parse(raw) as Partial<PersistedState>
    return {
      lastFolder: parsed.lastFolder ?? null,
      lastFile: parsed.lastFile ?? null,
      expandedDirs: Array.isArray(parsed.expandedDirs) ? parsed.expandedDirs : [],
    }
  } catch {
    return EMPTY_STATE
  }
}

export async function saveState(state: PersistedState): Promise<void> {
  try {
    await mkdir('', { ...STATE_DIR_OPTS, recursive: true }).catch(() => undefined)
    await writeTextFile(STATE_FILE, JSON.stringify(state, null, 2), STATE_DIR_OPTS)
  } catch (err) {
    console.error('Failed to persist state', err)
  }
}
