import { Command } from '@tauri-apps/plugin-shell'

export type HugoBuildResult = {
  ok: boolean
  code: number
  stdout: string
  stderr: string
}

export async function runHugoBuild(siteRoot: string): Promise<HugoBuildResult> {
  const cmd = Command.create('hugo', [
    '--source',
    siteRoot,
    '--minify',
    '--cleanDestinationDir',
  ])
  const output = await cmd.execute()
  return {
    ok: output.code === 0,
    code: output.code ?? -1,
    stdout: output.stdout,
    stderr: output.stderr,
  }
}
