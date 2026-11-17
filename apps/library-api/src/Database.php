<?php

declare(strict_types=1);

namespace Ruda\Library;

use PDO;

/** The SQLite database; the schema is created on first use. */
final class Database
{
    public readonly PDO $pdo;

    public function __construct(string $path)
    {
        $this->pdo = new PDO('sqlite:' . $path, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $this->pdo->exec('PRAGMA busy_timeout = 5000');
        $this->pdo->exec(<<<'SQL'
            CREATE TABLE IF NOT EXISTS creations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                slug TEXT UNIQUE,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                author TEXT NOT NULL,
                data TEXT NOT NULL,
                status TEXT NOT NULL CHECK (status IN ('pending', 'approved')),
                submitted_at INTEGER NOT NULL,
                approved_at INTEGER
            );
            CREATE INDEX IF NOT EXISTS creations_status ON creations (status, approved_at);
            CREATE TABLE IF NOT EXISTS attempts (
                action TEXT NOT NULL,
                client TEXT NOT NULL,
                at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS attempts_lookup ON attempts (action, client, at);
            SQL);
    }
}
