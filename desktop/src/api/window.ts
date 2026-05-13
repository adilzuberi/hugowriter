import { getCurrentWindow } from '@tauri-apps/api/window'

export async function setWindowTitle(title: string): Promise<void> {
  try {
    await getCurrentWindow().setTitle(title)
  } catch {
    // No-op in non-Tauri runtimes (Vitest / SSR). The title bar UI carries the same signal.
  }
}
