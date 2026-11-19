# Ruda

A 2D, top-down web simulator inspired by Minecraft redstone. Build logic circuits (clocks, gates, even a calculator) on an endless canvas.

**Play it: <https://ruda.omarek.cz>**

Not a 1:1 Minecraft clone: signals are on/off, the world is flat, and crossings are a dedicated tile.

## Status

Version 1.0 is ready for release. Implemented: the playable core, saving, timing and inputs, pistons, the graphical interface (start screen, the game, world selection), debug mode and the library. Sounds are not done yet. The library (a shared collection of creations with a PHP backend) is built and tested but switched off in the web app for now (`LIBRARY_ENABLED` in [App.vue](apps/web/src/App.vue)). See [docs/SPEC.md](docs/SPEC.md) for the feature list and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design.

## Development

Requires Node.js and pnpm (`corepack enable`).

```sh
pnpm install
pnpm dev           # start the web app
pnpm dev:library   # start the library API (needs PHP 8.1+ with pdo_sqlite)
pnpm test          # run tests (the library API tests need PHP)
pnpm typecheck
pnpm lint
```

Versioning and the release checklist: [docs/UPDATE_GUIDE.md](docs/UPDATE_GUIDE.md).

## Deploy

The game is a static site, so any web hosting works (production: <https://ruda.omarek.cz>). The library backend is not needed while the library is switched off.

1. Make sure everything is committed (the source archive is made from the last commit) and that `pnpm typecheck`, `pnpm lint` and `pnpm test` pass.
2. `pnpm build`. The result is in `apps/web/dist`: `index.html`, `assets/`, the favicon and social preview image, and the source archive `ruda_vN.N.zip` that the About dialog links to.
3. Upload the **contents** of `apps/web/dist` to the web root of the (sub)domain, replacing the previous files. Old `assets/*` files can be deleted: their names change with every build.
4. HTTPS is required: the game uses browser APIs (`crypto.randomUUID`) that exist only in secure contexts. The `.htaccess` that ships in `dist` redirects HTTP and `www.` to `https://ruda.omarek.cz` (Apache with `mod_rewrite`). Before the first upload:
   - enable a certificate (e.g. Let's Encrypt) for **both** `ruda.omarek.cz` and `www.ruda.omarek.cz`, and create the `www` DNS record (CNAME to `ruda.omarek.cz`), otherwise visitors of `www` get a certificate warning before the redirect can happen;
   - if the hosting terminates TLS in a proxy and the redirect loops, replace the first condition with `RewriteCond %{HTTP:X-Forwarded-Proto} !https`;
   - the HSTS header is sticky: browsers remember it for a year, so do not enable HTTPS only halfway.
     Otherwise no server-side code is needed: the app never changes the URL path.
5. Check the deployed site: the start screen loads, a world can be created and saved, and the zip downloads from About. Link previews can be tested with the sharing debuggers of Facebook or LinkedIn (they cache the image, so check it before announcing the release).
6. Tag the release (`git tag v1.0`).

The full release checklist (changelog, version bump) is in [docs/UPDATE_GUIDE.md](docs/UPDATE_GUIDE.md). To deploy the library later, see [apps/library-api/README.md](apps/library-api/README.md) and set `LIBRARY_ENABLED` to `true`.

## Stack

- `packages/core` – TypeScript simulation library (no UI)
- `packages/creations` – built-in creations drawn from ASCII maps, with behaviour tests
- `apps/web` – Vue 3 + Vite + Canvas 2D
- `apps/library-api` – PHP + SQLite backend of the library

Worlds are saved locally and can be exported to `.ruda` files (minified JSON).

## License

[PolyForm Noncommercial 1.0.0](LICENSE): the source is open to read, use, change and share for any noncommercial purpose. Commercial use is not permitted. Because of that restriction the project is source-available, not open source in the OSI sense, and GitHub shows the license as "Other".
