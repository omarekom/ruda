<?php

declare(strict_types=1);

namespace Ruda\Library;

/** Counts recent attempts per client; clients are stored only as keyed hashes. */
final class RateLimiter
{
    public function __construct(
        private readonly Database $database,
        private readonly string $secret,
    ) {
    }

    /** Records an attempt, or fails if the client already made `$limit` within `$windowSeconds`. */
    public function hit(string $action, string $clientAddress, int $limit, int $windowSeconds): void
    {
        $client = hash_hmac('sha256', $clientAddress, $this->secret);
        $now = time();
        $pdo = $this->database->pdo;
        $pdo->prepare('DELETE FROM attempts WHERE at < ?')->execute([$now - 86400]);
        $count = $pdo->prepare('SELECT COUNT(*) FROM attempts WHERE action = ? AND client = ? AND at >= ?');
        $count->execute([$action, $client, $now - $windowSeconds]);
        if ((int) $count->fetchColumn() >= $limit) {
            throw new HttpError(429, 'rate_limited');
        }
        $pdo->prepare('INSERT INTO attempts (action, client, at) VALUES (?, ?, ?)')
            ->execute([$action, $client, $now]);
    }
}
