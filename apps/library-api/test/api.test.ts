import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ADMIN_PASSWORD, Client, TestServer } from './server';

interface Entry {
  id: number;
  title: string;
  author: string;
  builtIn: boolean;
  data: string;
}

const seedFile = JSON.parse(
  readFileSync(new URL('../seed/creations.json', import.meta.url), 'utf8'),
) as { slug: string; title: string }[];

const world =
  '{"rudaversion":1,"name":"Mine","blocks":{"lever:off":[0,0],"wire":[1,0],"lamp":[2,0]}}';
const submission = {
  title: 'My lamp',
  description: 'A lever and a lamp.',
  author: 'Ada',
  data: world,
};

let server: TestServer;

beforeAll(async () => {
  server = await TestServer.start();
});
afterAll(() => server.stop());

async function admin(): Promise<Client> {
  const client = new Client(server.baseUrl);
  expect((await client.request('POST', '/admin/login', { password: ADMIN_PASSWORD })).status).toBe(
    204,
  );
  return client;
}

async function published(client = new Client(server.baseUrl)): Promise<Entry[]> {
  const response = await client.request('GET', '/creations');
  expect(response.status).toBe(200);
  return response.json['items'] as Entry[];
}

describe('library API', () => {
  it('seeds the built-in creations once, in order', async () => {
    expect(await published()).toEqual([]);
    expect(server.seed()).toContain(`added   ${seedFile[0]?.slug}`);
    expect(server.seed()).not.toContain('added');
    const items = await published();
    expect(items.map((item) => item.title)).toEqual(seedFile.map((entry) => entry.title));
    expect(items.every((item) => item.builtIn && item.author === 'Ruda')).toBe(true);
  });

  it('keeps submissions out of the library until the admin approves them', async () => {
    const player = new Client(server.baseUrl);
    const created = await player.request('POST', '/submissions', submission);
    expect(created.status).toBe(201);
    const id = created.json['id'] as number;
    expect((await published()).some((item) => item.id === id)).toBe(false);

    const moderator = await admin();
    const pending = (await moderator.request('GET', '/admin/submissions')).json['items'] as Entry[];
    expect(pending.map((item) => item.id)).toContain(id);

    expect((await moderator.request('POST', `/admin/submissions/${id}/approve`)).status).toBe(204);
    const items = await published();
    expect(items.at(-1)).toMatchObject({
      id,
      title: 'My lamp',
      author: 'Ada',
      builtIn: false,
      data: world,
    });
    expect((await moderator.request('GET', '/admin/submissions')).json['items']).toEqual([]);

    expect((await moderator.request('DELETE', `/admin/creations/${id}`)).status).toBe(204);
    expect((await published()).some((item) => item.id === id)).toBe(false);
    expect((await moderator.request('DELETE', `/admin/creations/${id}`)).status).toBe(404);
  });

  it('lets the admin reject a submission', async () => {
    const id = (await new Client(server.baseUrl).request('POST', '/submissions', submission)).json[
      'id'
    ];
    const moderator = await admin();
    expect((await moderator.request('DELETE', `/admin/creations/${String(id)}`)).status).toBe(204);
    expect(
      (await moderator.request('POST', `/admin/submissions/${String(id)}/approve`)).status,
    ).toBe(404);
  });

  it('protects admin routes with the password', async () => {
    const stranger = new Client(server.baseUrl);
    expect((await stranger.request('GET', '/admin/submissions')).status).toBe(401);
    expect((await stranger.request('POST', '/admin/submissions/1/approve')).status).toBe(401);
    const wrong = await stranger.request('POST', '/admin/login', { password: 'nope' });
    expect(wrong).toEqual({ status: 401, json: { error: 'wrong_password' } });
    expect((await stranger.request('GET', '/admin/session')).json).toEqual({ loggedIn: false });

    const moderator = await admin();
    expect((await moderator.request('GET', '/admin/session')).json).toEqual({ loggedIn: true });
    expect((await moderator.request('POST', '/admin/logout')).status).toBe(204);
    expect((await moderator.request('GET', '/admin/submissions')).status).toBe(401);
  });

  it('refuses state changes that do not come from the app', async () => {
    const response = await new Client(server.baseUrl).request(
      'POST',
      '/submissions',
      submission,
      false,
    );
    expect(response).toEqual({ status: 403, json: { error: 'forbidden' } });
  });

  it.each([
    ['title', { title: '' }],
    ['title', { title: 'x'.repeat(81) }],
    ['author', { author: '   ' }],
    ['description', { description: 'x'.repeat(501) }],
    ['data', { data: 'not json' }],
    ['data', { data: '{"rudaversion":1,"name":"x","blocks":{"wire":[0]}}' }],
    ['data', { data: '{"rudaversion":1,"name":"x","blocks":{"Wire!":[0,0]}}' }],
    ['data', { data: '{"rudaversion":"1","name":"x","blocks":{}}' }],
  ])('rejects an invalid %s', async (field, change) => {
    const response = await new Client(server.baseUrl).request('POST', '/submissions', {
      ...submission,
      ...change,
    });
    expect(response).toEqual({ status: 400, json: { error: 'invalid_field', field } });
  });

  it('strips control characters and rejects the bot trap field', async () => {
    const player = new Client(server.baseUrl);
    const id = (
      await player.request('POST', '/submissions', { ...submission, title: 'Ti\u0007tle ' })
    ).json['id'];
    const pending = (await (await admin()).request('GET', '/admin/submissions')).json[
      'items'
    ] as Entry[];
    expect(pending.find((item) => item.id === id)?.title).toBe('Title');
    const trap = await player.request('POST', '/submissions', {
      ...submission,
      website: 'http://spam',
    });
    expect(trap.status).toBe(400);
  });

  it('allows 5 submissions per client and hour', async () => {
    const fresh = await TestServer.start();
    try {
      const player = new Client(fresh.baseUrl);
      const statuses: number[] = [];
      for (let i = 0; i < 6; i++) {
        statuses.push((await player.request('POST', '/submissions', submission)).status);
      }
      expect(statuses).toEqual([201, 201, 201, 201, 201, 429]);
    } finally {
      fresh.stop();
    }
  });

  it('answers unknown routes with not_found', async () => {
    expect((await new Client(server.baseUrl).request('GET', '/nope')).status).toBe(404);
  });
});
