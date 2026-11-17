<?php

declare(strict_types=1);

namespace Ruda\Library;

use RuntimeException;

/** Server settings, read from the PHP file named by RUDA_LIBRARY_CONFIG or ../config.php. */
final class Config
{
    public function __construct(
        public readonly string $databasePath,
        /** A password_hash() of the admin password. */
        public readonly string $adminPasswordHash,
        /** A long random string; used to anonymise client addresses for rate limiting. */
        public readonly string $secret,
    ) {
    }

    public static function load(): self
    {
        $path = getenv('RUDA_LIBRARY_CONFIG') ?: dirname(__DIR__) . '/config.php';
        if (!is_file($path)) {
            throw new RuntimeException('Library config not found; copy config.example.php to config.php');
        }
        $values = require $path;
        if (!is_array($values)) {
            throw new RuntimeException('The library config must return an array');
        }
        return new self(
            self::string($values, 'database_path'),
            self::string($values, 'admin_password_hash'),
            self::string($values, 'secret'),
        );
    }

    /** @param array<mixed> $values */
    private static function string(array $values, string $key): string
    {
        $value = $values[$key] ?? null;
        if (!is_string($value) || $value === '') {
            throw new RuntimeException("Library config is missing \"$key\"");
        }
        return $value;
    }
}
