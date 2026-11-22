# Update guide

How Ruda is versioned and what to do before each release. Releases are deployed by hand to a PHP hosting: the built `apps/web/dist` and `apps/library-api`.

## Versioning

- The first release is **1.0**; later ones count up: 1.1, 1.2, …
- **Minor** (second digit): new gameplay that players will feel, such as new blocks, new mechanics or a new mode. Gets an entry in the in-game changelog.
- **Patch** (third digit, e.g. 1.0.1): everything else: bugfixes, interface and usability improvements, and small tools such as additions to debug mode (undo and redo, keyboard shortcuts, the `?` keys overlay). Not in the in-game changelog.
- Every release, patch or minor, gets an entry in [CHANGELOG.md](../CHANGELOG.md). Changes go there as they are made, under the coming version marked unreleased.
- The project owner decides. Before releasing, or when unsure which number to raise, ask; never bump the version or release on your own.
- No plans for 2.0.
- The version lives in one place: `version` in [apps/web/package.json](../apps/web/package.json), written in full semver (`1.1.0`). The app shows it as `1.1` (`1.0.1` for a patch release) next to the About button.

## Checklist for every new version (minor and major)

1. **README** – make sure [README.md](../README.md) is up to date and accurate (status, commands, stack).
2. **Changelog** – in [CHANGELOG.md](../CHANGELOG.md), give the unreleased entry its version and date. Then add an entry to `changelog.versions` in [en.json](../apps/web/src/locales/en.json), at the top (newest first). The key is the version with an underscore, e.g. `v1_1` for 1.1. Keep it concise and accurate: a few short lines about what players get. It is shown in the dialog opened by the version label on the start screen. Give the version an icon in `VERSION_ICONS` ([ChangelogDialog.vue](../apps/web/src/components/ChangelogDialog.vue)) that stands for its main feature: a block, or a pixel icon on a label's plate (1.0 has the power block, 1.1 a `T` for labels).
3. **Bugcheck** – a brief one, most importantly of the back end (`apps/library-api`: submissions, admin login, rate limiting, database). Run `pnpm typecheck`, `pnpm lint` and `pnpm test` (the library API tests need PHP) and try the changed features by hand.
4. **Version bump** – update `version` in `apps/web/package.json`.
5. **Commit** everything. The source archive is made from the last commit, so uncommitted changes are not in it.
6. **Build** with `pnpm build`. Besides the app, it writes the source archive `ruda_vN.N.zip` (e.g. `ruda_v1.1.zip`) into `apps/web/dist`, and the About dialog links to it. To make only the archive: `node scripts/sourceZip.ts [output directory]`.
7. **Deploy** `apps/web/dist` (including the zip) to the hosting, and `apps/library-api` if it changed (see its [README](../apps/library-api/README.md)).
8. **Check the download**: open About on the deployed site and make sure the zip downloads.
9. **Tag** the commit (`git tag v1.1`).

Patch releases follow the same steps, except that they get only the CHANGELOG.md entry, not one in the game, and the archive is named after the full version (`ruda_v1.0.1.zip`).
