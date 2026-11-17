<?php

declare(strict_types=1);

namespace Ruda\Library;

/** The admin's login, kept in a PHP session cookie. */
final class AdminSession
{
    private const SESSION_NAME = 'ruda_library_admin';

    public function __construct(private readonly bool $secure)
    {
    }

    public function isLoggedIn(): bool
    {
        $this->start();
        return ($_SESSION['admin'] ?? false) === true;
    }

    public function logIn(): void
    {
        $this->start();
        session_regenerate_id(true);
        $_SESSION['admin'] = true;
    }

    public function logOut(): void
    {
        $this->start();
        $_SESSION = [];
        session_destroy();
    }

    public function requireLogin(): void
    {
        if (!$this->isLoggedIn()) {
            throw new HttpError(401, 'unauthorized');
        }
    }

    private function start(): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }
        session_name(self::SESSION_NAME);
        session_set_cookie_params([
            'httponly' => true,
            'samesite' => 'Strict',
            'secure' => $this->secure,
        ]);
        session_start();
    }
}
