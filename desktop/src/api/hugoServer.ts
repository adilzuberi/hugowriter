import { Command, type Child } from '@tauri-apps/plugin-shell'

export const HUGO_PORT = 51313

export type HugoServerHandle = {
  child: Child
  port: number
}

export async function startHugoServer(siteRoot: string): Promise<HugoServerHandle> {
  const args = [
    'server',
    '--source',
    siteRoot,
    '--port',
    String(HUGO_PORT),
    '--bind',
    '127.0.0.1',
    '--buildDrafts',
    '--watch',
    '--disableFastRender',
  ]
  const cmd = Command.create('hugo-server', args)
  const child = await cmd.spawn()
  return { child, port: HUGO_PORT }
}

export async function stopHugoServer(handle: HugoServerHandle): Promise<void> {
  try {
    await handle.child.kill()
  } catch {
    // Process may already be gone; ignore.
  }
}

export async function probeHugoAvailable(): Promise<boolean> {
  try {
    const cmd = Command.create('hugo', ['version'])
    const output = await cmd.execute()
    return output.code === 0
  } catch {
    return false
  }
}
