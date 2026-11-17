import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const ADMIN_PASSWORD = 'test-password';

/** A PHP development server with a fresh database, for one test file. */
export class TestServer {
  private constructor(
    private readonly process: ChildProcess,
    private readonly env: NodeJS.ProcessEnv,
    readonly baseUrl: string,
  ) {}

  static async start(): Promise<TestServer> {
    const dir = mkdtempSync(join(tmpdir(), 'ruda-library-'));
    const configPath = join(dir, 'config.php');
    writeFileSync(
      configPath,
      `<?php return ['database_path' => ${JSON.stringify(join(dir, 'library.sqlite'))}, ` +
        `'admin_password_hash' => password_hash(${JSON.stringify(ADMIN_PASSWORD)}, PASSWORD_DEFAULT), ` +
        `'secret' => 'test-secret'];`,
    );
    const env = { ...process.env, RUDA_LIBRARY_CONFIG: configPath };
    const port = await freePort();
    const child = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', ROOT], { env, stdio: 'ignore' });
    const server = new TestServer(child, env, `http://127.0.0.1:${port}/api.php`);
    await server.waitUntilReady();
    return server;
  }

  stop(): void {
    this.process.kill();
  }

  /** Runs `php bin/seed.php` against this server's database and returns its output. */
  seed(): string {
    const result = spawnSync('php', ['bin/seed.php'], {
      cwd: ROOT,
      env: this.env,
      encoding: 'utf8',
    });
    if (result.status !== 0) throw new Error(result.stderr);
    return result.stdout;
  }

  private async waitUntilReady(): Promise<void> {
    for (let attempt = 0; attempt < 50; attempt++) {
      try {
        await fetch(`${this.baseUrl}/creations`);
        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    throw new Error('PHP server did not start');
  }
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      probe.close(() =>
        typeof address === 'object' && address ? resolve(address.port) : reject(),
      );
    });
  });
}

/** A minimal API client that, like the app, sends the app header and keeps the session cookie. */
export class Client {
  private cookie = '';

  constructor(private readonly baseUrl: string) {}

  async request(method: string, path: string, body?: unknown, fromApp = true) {
    const headers: Record<string, string> = {};
    if (fromApp) headers['X-Ruda-Library'] = '1';
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (this.cookie) headers['Cookie'] = this.cookie;
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) this.cookie = setCookie.split(';')[0] ?? '';
    const text = await response.text();
    return {
      status: response.status,
      json: text ? (JSON.parse(text) as Record<string, unknown>) : {},
    };
  }
}
