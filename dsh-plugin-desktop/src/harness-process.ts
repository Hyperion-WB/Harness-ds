/**
 * Native Harness Process Manager referencing dataelement/dsh-desktop architecture.
 * Manages the isolated DeepSeek Harness lifecycle, environment resolution, port allocation,
 * and active HTTP/WebSocket health polling.
 */

import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { createWriteStream, existsSync, mkdirSync, type WriteStream } from 'node:fs'
import { createServer } from 'node:net'
import { join } from 'node:path'
import { EventEmitter } from 'node:events'

const LOG_DIRECTORY = 'logs'
const HARNESS_LOG_FILENAME = 'harness.log'
const STARTUP_TIMEOUT_MS = 60_000

let resolvedShellEnvironment: NodeJS.ProcessEnv | undefined

/**
 * Capture the user's interactive login shell environment.
 * On Windows, loads $PROFILE in UTF-8 mode to ensure full PATH and prevent CJK U+FFFD corruptions.
 * On macOS/Linux, invokes an interactive login shell to capture Homebrew, mise, pyenv, etc.
 */
export function resolveShellEnvironment(): NodeJS.ProcessEnv {
  if (resolvedShellEnvironment !== undefined) return resolvedShellEnvironment

  try {
    if (process.platform === 'win32') {
      const output = execFileSync(
        'powershell',
        [
          '-NoLogo',
          '-NonInteractive',
          '-OutputFormat', 'Text',
          '-Command',
          '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ' +
          '. $PROFILE 2>$null; Get-ChildItem Env: | ForEach-Object { "$($_.Name)=$($_.Value)" }',
        ],
        {
          encoding: 'utf8',
          timeout: 15_000,
          stdio: ['ignore', 'pipe', 'ignore'],
        },
      )
      resolvedShellEnvironment = withoutUndecodableValues(
        parseEnvOutput(output, /\r?\n/),
        process.env,
      )
    } else {
      const shellPath = process.env.SHELL ?? '/bin/sh'
      const output = execFileSync(shellPath, ['-l', '-i', '-c', 'env'], {
        encoding: 'utf8',
        timeout: 10_000,
        stdio: ['ignore', 'pipe', 'ignore'],
      })
      resolvedShellEnvironment = parseEnvOutput(output, /\n/)
    }
  } catch {
    resolvedShellEnvironment = process.env
  }

  return resolvedShellEnvironment
}

/**
 * Filter out replacement characters (U+FFFD) caused by codepage mismatches.
 */
export function withoutUndecodableValues(
  captured: NodeJS.ProcessEnv,
  inherited: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  const result: NodeJS.ProcessEnv = {}
  for (const [name, value] of Object.entries(captured)) {
    if (value === undefined || !value.includes('\uFFFD')) {
      result[name] = value
      continue
    }
    const fallback = inherited[name]
    if (fallback !== undefined) result[name] = fallback
  }
  return result
}

function parseEnvOutput(output: string, lineSeparator: RegExp): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}
  for (const line of output.split(lineSeparator)) {
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    env[line.slice(0, eq)] = line.slice(eq + 1)
  }
  return env
}

/**
 * Safely allocate an open ephemeral loopback port.
 */
export async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (typeof address === 'object' && address !== null) {
        const port = address.port
        server.close(() => resolve(port))
      } else {
        server.close(() => reject(new Error('Unable to determine allocated port')))
      }
    })
  })
}

/**
 * Poll the Harness Web server until it responds with HTTP 200 OK.
 */
export async function waitForHarnessReady(
  url: string,
  timeoutMs: number = STARTUP_TIMEOUT_MS,
  signal?: AbortSignal,
): Promise<void> {
  const start = Date.now()
  let delay = 100

  while (Date.now() - start < timeoutMs) {
    if (signal?.aborted) throw new Error('Startup aborted')

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'DSH-Desktop-Probe/2.0' },
        signal: AbortSignal.timeout(2000),
      })
      if (res.status === 200 || res.status === 302 || res.status === 304) {
        return
      }
    } catch {
      // Waiting for socket listener
    }

    await new Promise(r => setTimeout(r, delay))
    delay = Math.min(delay * 1.3, 1000)
  }

  throw new Error(`DSH backend service at ${url} failed to respond within ${timeoutMs / 1000}s`)
}

export interface HarnessProcessConfig {
  dshEntryPath: string
  dshHome: string
  userDataPath: string
  profile?: string
  port?: number
}

export class HarnessProcessManager extends EventEmitter {
  private child: ChildProcess | null = null
  private logStream: WriteStream | null = null
  private _port: number | null = null
  private _url: string | null = null
  private stopping = false

  get port(): number | null {
    return this._port
  }

  get url(): string | null {
    return this._url
  }

  get isRunning(): boolean {
    return this.child !== null && this.child.exitCode === null
  }

  /**
   * Start the native Harness process and wait until it is verified healthy.
   */
  async start(config: HarnessProcessConfig): Promise<string> {
    if (this.isRunning) {
      return this._url!
    }

    const port = config.port ?? (await findFreePort())
    this._port = port
    const url = `http://127.0.0.1:${port}/`
    this._url = url

    const logDir = join(config.userDataPath, LOG_DIRECTORY)
    if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true })
    const logPath = join(logDir, HARNESS_LOG_FILENAME)
    this.logStream = createWriteStream(logPath, { flags: 'a' })

    const shellEnv = resolveShellEnvironment()
    const { ELECTRON_RUN_AS_NODE: _runAsNode, ...parentEnv } = shellEnv

    const spawnEnv: NodeJS.ProcessEnv = {
      ...parentEnv,
      DSH_HOME: config.dshHome,
      NO_COLOR: '1',
      PNPM_MAX_WORKERS: '1',
      npm_config_child_concurrency: '1',
      npm_config_package_import_method: 'clone-or-copy',
      npm_config_side_effects_cache: 'false',
    }

    const args = [
      config.dshEntryPath,
      'web',
      '--host', '127.0.0.1',
      '--port', String(port),
      '--no-open',
    ]
    if (config.profile && config.profile !== 'web') {
      args.push('--profile', config.profile)
    }

    const nodeExecutable = process.execPath

    this.logStream.write(`\n[desktop] Starting DeepSeek Harness core on port ${port} at ${new Date().toISOString()}\n`)

    const child = spawn(nodeExecutable, args, {
      cwd: config.dshHome,
      env: spawnEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    this.child = child

    child.stdout.on('data', (chunk: Buffer) => {
      this.logStream?.write(chunk)
    })

    child.stderr.on('data', (chunk: Buffer) => {
      this.logStream?.write(chunk)
    })

    child.on('error', (err) => {
      this.logStream?.write(`[desktop error] Child process error: ${err.message}\n`)
      this.emit('error', err)
    })

    child.on('exit', (code, signal) => {
      this.logStream?.write(`[desktop] Child process exited with code ${code}, signal ${signal}\n`)
      this.child = null
      this._url = null
      if (!this.stopping) {
        this.emit('unexpected-exit', { code, signal })
      }
    })

    // Active health check verification
    try {
      await waitForHarnessReady(url, STARTUP_TIMEOUT_MS)
      this.logStream.write(`[desktop] ✓ DeepSeek Harness is verified healthy and ready at ${url}\n`)
      this.emit('ready', { url, port })
      return url
    } catch (err) {
      this.stop()
      throw err
    }
  }

  /**
   * Stop the Harness process gracefully.
   */
  async stop(): Promise<void> {
    this.stopping = true
    const child = this.child
    if (!child) return

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        try {
          child.kill('SIGKILL')
        } catch {
          // Ignored
        }
        resolve()
      }, 3000)

      child.once('exit', () => {
        clearTimeout(timer)
        this.child = null
        this._url = null
        this._port = null
        this.logStream?.end()
        this.logStream = null
        this.stopping = false
        resolve()
      })

      try {
        child.kill('SIGTERM')
      } catch {
        child.kill()
      }
    })
  }
}
