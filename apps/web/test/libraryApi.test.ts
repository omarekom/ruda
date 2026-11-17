import { afterEach, describe, expect, it, vi } from 'vitest';
import { LibraryApi, LibraryError, libraryErrorKey } from '../src/library/api';

function respond(status: number, body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('LibraryApi', () => {
  it('sends the app header and JSON body', async () => {
    respond(201, { id: 1 });
    await new LibraryApi('/api.php').submit({
      title: 't',
      description: '',
      author: 'a',
      data: '{}',
      website: '',
    });
    const [url, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(url).toBe('/api.php/submissions');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({
      'X-Ruda-Library': '1',
      'Content-Type': 'application/json',
    });
  });

  it('turns server errors into LibraryError with code and field', async () => {
    respond(400, { error: 'invalid_field', field: 'title' });
    const failure = await new LibraryApi('/api.php').published().catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(LibraryError);
    expect(libraryErrorKey(failure)).toBe('library.errors.invalid_title');
  });

  it('reports unreachable servers as network errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('offline'))),
    );
    const failure = await new LibraryApi('/api.php').isAdmin().catch((error: unknown) => error);
    expect(libraryErrorKey(failure)).toBe('library.errors.network');
  });

  it('maps unknown codes to a generic message', () => {
    expect(libraryErrorKey(new LibraryError('teapot'))).toBe('library.errors.server_error');
    expect(libraryErrorKey(new Error('x'))).toBe('library.errors.server_error');
  });
});
