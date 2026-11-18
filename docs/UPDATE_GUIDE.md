# Update guide

How Ruda is versioned and what to do before each release. Releases are deployed by hand to a PHP hosting: the built `apps/web/dist` and `apps/library-api`.

## Versioning

- The first release is **1.0**; later ones count up: 1.1, 1.2, …
- **Minor** (second digit): new features. Gets a changelog entry.
- **Patch** (third digit, e.g. 1.0.1): bugfixes only. No changelog entry.
- No plans for 2.0.
- The version lives in one place: `version` in [apps/web/package.json](../apps/web/package.json), written in full semver (`1.1.0`). The app shows it as `1.1` (`1.0.1` for a patch release) next to the About button.
- The spec's `0.x` headings are the development milestones leading up to 1.0, not release versions.

## Checklist for every new version (minor and major)

1. **README** – make sure [README.md](../README.md) is up to date and accurate (status, commands, stack).
2. **Changelog** – add an entry to `changelog.versions` in [en.json](../apps/web/src/locales/en.json), at the top (newest first). The key is the version with an underscore, e.g. `v1_1` for 1.1. Keep it concise and accurate: a few short lines about what players get. It is shown in the dialog opened by the version label on the start screen.
3. **Bugcheck** – a brief one, most importantly of the back end (`apps/library-api`: submissions, admin login, rate limiting, database). Run `pnpm typecheck`, `pnpm lint` and `pnpm test` (the library API tests need PHP) and try the changed features by hand.
4. **Version bump** – update `version` in `apps/web/package.json`.
5. **Commit** everything. The source archive is made from the last commit, so uncommitted changes are not in it.
6. **Build** with `pnpm build`. Besides the app, it writes the source archive `ruda_vN.N.zip` (e.g. `ruda_v1.1.zip`) into `apps/web/dist`, and the About dialog links to it. To make only the archive: `node scripts/sourceZip.ts [output directory]`.
7. **Deploy** `apps/web/dist` (including the zip) to the hosting, and `apps/library-api` if it changed (see its [README](../apps/library-api/README.md)).
8. **Check the download**: open About on the deployed site and make sure the zip downloads.
9. **Tag** the commit (`git tag v1.1`).

Patch releases follow the same steps, except that no changelog entry is added, and the archive is named after the full version (`ruda_v1.0.1.zip`).
