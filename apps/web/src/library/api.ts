/** A creation as the library server returns it; times are milliseconds. */
export interface LibraryCreation {
  readonly id: number;
  readonly title: string;
  readonly description: string;
  readonly author: string;
  readonly builtIn: boolean;
  readonly submittedAt: number;
  readonly approvedAt: number | null;
  /** The world as `.ruda` text. */
  readonly data: string;
}

export interface NewSubmission {
  readonly title: string;
  readonly description: string;
  readonly author: string;
  readonly data: string;
  /** Hidden from players; bots that fill it in are rejected. */
  readonly website: string;
}

/** A failed request; `code` is the server's error code or `network`. */
export class LibraryError extends Error {
  constructor(
    readonly code: string,
    readonly field?: string,
  ) {
    super(code);
    this.name = 'LibraryError';
  }
}

const DEFAULT_BASE_URL = '/library/api.php';

/** Client for the library server; see apps/library-api/README.md. */
export class LibraryApi {
  constructor(
    private readonly baseUrl: string = import.meta.env.VITE_LIBRARY_API ?? DEFAULT_BASE_URL,
  ) {}

  async published(offset = 0): Promise<{ items: LibraryCreation[]; total: number }> {
    return this.request('GET', `/creations?offset=${offset}`);
  }

  async submit(submission: NewSubmission): Promise<void> {
    await this.request('POST', '/submissions', submission);
  }

  async isAdmin(): Promise<boolean> {
    const { loggedIn } = await this.request<{ loggedIn: boolean }>('GET', '/admin/session');
    return loggedIn;
  }

  async logIn(password: string): Promise<void> {
    await this.request('POST', '/admin/login', { password });
  }

  async logOut(): Promise<void> {
    await this.request('POST', '/admin/logout');
  }

  async pending(): Promise<LibraryCreation[]> {
    const { items } = await this.request<{ items: LibraryCreation[] }>('GET', '/admin/submissions');
    return items;
  }

  async approve(id: number): Promise<void> {
    await this.request('POST', `/admin/submissions/${id}/approve`);
  }

  /** Rejects a submission or takes down a published creation. */
  async remove(id: number): Promise<void> {
    await this.request('DELETE', `/admin/creations/${id}`);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { 'X-Ruda-Library': '1' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    let response: Response;
    try {
      response = await fetch(this.baseUrl + path, {
        method,
        headers,
        credentials: 'same-origin',
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new LibraryError('network');
    }
    const text = await response.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      throw new LibraryError('server_error');
    }
    if (!response.ok) {
      const error = json as { error?: unknown; field?: unknown };
      throw new LibraryError(
        typeof error.error === 'string' ? error.error : 'server_error',
        typeof error.field === 'string' ? error.field : undefined,
      );
    }
    return json as T;
  }
}

/** The i18n key describing a failed library request. */
export function libraryErrorKey(error: unknown): string {
  if (!(error instanceof LibraryError)) return 'library.errors.server_error';
  if (error.code === 'invalid_field' && error.field) return `library.errors.invalid_${error.field}`;
  const known = ['network', 'rate_limited', 'wrong_password', 'unauthorized'];
  return `library.errors.${known.includes(error.code) ? error.code : 'server_error'}`;
}
