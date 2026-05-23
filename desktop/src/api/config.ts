import { invoke } from '@tauri-apps/api/core'

export type ThemeSettings = {
  preset: 'focus-stock' | 'edevanrich'
  basePx: number
  accent: string
}

export type EffectiveConfig = {
  title: string
  description: string
  languageCode: string
  baseURL: string
  params: { theme: ThemeSettings }
}

export type SourceMap = Record<string, string>

export type ConfigLoadResult = {
  effective: EffectiveConfig
  sources: SourceMap
}

export async function configLoad(siteRoot: string): Promise<ConfigLoadResult> {
  return invoke<ConfigLoadResult>('config_load', { siteRoot })
}

export async function configWrite(
  file: string,
  keyPath: string,
  value: unknown,
): Promise<void> {
  await invoke('config_write', { file, keyPath, value })
}

export async function configTouchSentinel(siteRoot: string): Promise<void> {
  await invoke('config_touch_sentinel', { siteRoot })
}
