import { describe, expect, it } from 'vitest'
import {
  findFreePort,
  resolveShellEnvironment,
  withoutUndecodableValues,
} from '../src/harness-process.ts'

describe('Harness Process Manager & Environment', () => {
  it('allocates an available ephemeral port', async () => {
    const port = await findFreePort()
    expect(port).toBeGreaterThan(1024)
    expect(port).toBeLessThan(65536)
  })

  it('filters corrupted replacement characters without losing valid environment variables', () => {
    const captured: NodeJS.ProcessEnv = {
      VALID_VAR: 'hello world',
      CORRUPTED_PATH: 'C:\\Users\\\uFFFD\\Temp',
      ANOTHER_VALID: '/usr/local/bin',
    }
    const inherited: NodeJS.ProcessEnv = {
      CORRUPTED_PATH: 'C:\\Users\\Default\\Temp',
      FALLBACK_VAR: 'fallback',
    }

    const sanitized = withoutUndecodableValues(captured, inherited)
    expect(sanitized.VALID_VAR).toBe('hello world')
    expect(sanitized.ANOTHER_VALID).toBe('/usr/local/bin')
    expect(sanitized.CORRUPTED_PATH).toBe('C:\\Users\\Default\\Temp')
  })

  it('captures the shell environment without crashing', () => {
    const env = resolveShellEnvironment()
    expect(env).toBeDefined()
    const pathKey = process.platform === 'win32'
      ? Object.keys(env).find(k => k.toUpperCase() === 'PATH')
      : 'PATH'
    expect(pathKey).toBeDefined()
    expect(env[pathKey!]).toBeTruthy()
  })
})
