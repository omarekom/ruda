<?php

declare(strict_types=1);

namespace Ruda\Library;

use Throwable;

/** Routes requests to handlers and turns errors into JSON responses. */
final class Api
{
    private const PAGE_SIZE = 50;
    private const SUBMISSIONS_PER_HOUR = 5;
    private const LOGIN_ATTEMPTS_PER_15_MINUTES = 10;

    public function __construct(private readonly Config $config)
    {
    }

    public function handle(Request $request): Response
    {
        try {
            // A custom header cannot be sent by another site without a CORS preflight, which
            // this API never allows, so it guards every state change against cross-site requests.
            if ($request->method !== 'GET' && !$request->fromApp) {
                throw new HttpError(403, 'forbidden');
            }
            return $this->route($request);
        } catch (HttpError $error) {
            return $error->toResponse();
        } catch (Throwable $error) {
            error_log('Ruda library: ' . $error);
            return new Response(500, ['error' => 'server_error']);
        }
    }

    private function route(Request $request): Response
    {
        $database = new Database($this->config->databasePath);
        $creations = new Creations($database);
        $limiter = new RateLimiter($database, $this->config->secret);
        $admin = new AdminSession($request->secure);
        $route = $request->method . ' ' . $request->path;

        if ($route === 'GET /creations') {
            $offset = max(0, (int) ($request->query['offset'] ?? 0));
            return new Response(200, [
                'items' => $creations->published($offset, self::PAGE_SIZE),
                'total' => $creations->publishedCount(),
            ]);
        }
        if ($route === 'POST /submissions') {
            $submission = Submission::fromInput($request->json());
            $limiter->hit('submit', $request->clientAddress, self::SUBMISSIONS_PER_HOUR, 3600);
            return new Response(201, ['id' => $creations->submit($submission)]);
        }
        if ($route === 'GET /admin/session') {
            return new Response(200, ['loggedIn' => $admin->isLoggedIn()]);
        }
        if ($route === 'POST /admin/login') {
            $limiter->hit('login', $request->clientAddress, self::LOGIN_ATTEMPTS_PER_15_MINUTES, 900);
            $password = $request->json()['password'] ?? null;
            if (!is_string($password) || !password_verify($password, $this->config->adminPasswordHash)) {
                throw new HttpError(401, 'wrong_password');
            }
            $admin->logIn();
            return Response::noContent();
        }
        if ($route === 'POST /admin/logout') {
            $admin->logOut();
            return Response::noContent();
        }

        if (str_starts_with($request->path, '/admin/')) {
            $admin->requireLogin();
            if ($route === 'GET /admin/submissions') {
                return new Response(200, ['items' => $creations->pending()]);
            }
            if (preg_match('#^POST /admin/submissions/(\d+)/approve$#', $route, $match) === 1) {
                $creations->approve((int) $match[1]);
                return Response::noContent();
            }
            if (preg_match('#^DELETE /admin/creations/(\d+)$#', $route, $match) === 1) {
                $creations->delete((int) $match[1]);
                return Response::noContent();
            }
        }
        throw new HttpError(404, 'not_found');
    }
}
