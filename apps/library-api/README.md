# Ruda library API

A small PHP + SQLite backend for the creation library. Players browse approved creations and
submit their own; submissions wait in a queue until the admin approves them in the app.

Requirements: PHP 8.1+ with the `pdo_sqlite` extension, Apache with `.htaccess` support
(or any server where only `api.php` is reachable from the web).

## Deploying

1. Upload this folder so the API is served at `/library/api.php` next to the web app
   (the app calls that path on its own origin; build with `VITE_LIBRARY_API=<url>` to change it).
   Only `api.php` is public; `.htaccess` denies everything else.
2. Copy `config.example.php` to `config.php` and fill it in:
   - `admin_password_hash`: run `php bin/hash-password.php`.
   - `secret`: a long random string.
   - `database_path`: preferably a path outside the web root. The folder must be writable by PHP.
3. Add the built-in creations: `php bin/seed.php`. Running it again only adds new ones.
4. Open the app, go to the Library tab and add `#admin` to the address to log in as admin.

Back up the database by copying the SQLite file.

## Endpoints

All routes are under `api.php`, e.g. `GET /library/api.php/creations`. Every request except
`GET` must carry the header `X-Ruda-Library: 1`.

| Route                                  | Purpose                                                             |
| -------------------------------------- | ------------------------------------------------------------------- |
| `GET /creations?offset=`               | Approved creations (built-in first), 50 per page, and the total     |
| `POST /submissions`                    | `{title, description, author, data}`; at most 5 per client and hour |
| `GET /admin/session`                   | `{loggedIn}`                                                        |
| `POST /admin/login`                    | `{password}`; at most 10 attempts per client and 15 minutes         |
| `POST /admin/logout`                   |                                                                     |
| `GET /admin/submissions`               | Creations waiting for approval, oldest first                        |
| `POST /admin/submissions/{id}/approve` | Publishes a submission                                              |
| `DELETE /admin/creations/{id}`         | Rejects a submission or takes down a published creation             |

Errors are JSON: `{"error": "<code>"}`, plus `"field"` for invalid input.

## Development

`pnpm --filter @ruda/library-api dev` seeds a local database and serves the API on port 8090
(admin password `admin`); the web app's dev server proxies `/library` to it.
`pnpm --filter @ruda/library-api test` runs the integration tests against a real PHP server.
