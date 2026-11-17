<?php

declare(strict_types=1);

namespace Ruda\Library;

use PDO;

/** Library entries: approved creations are public, pending ones wait for the admin. */
final class Creations
{
    public function __construct(private readonly Database $database)
    {
    }

    /**
     * Approved creations: built-in ones first in seed order, then community ones newest first.
     *
     * @return list<array<string, mixed>>
     */
    public function published(int $offset, int $limit): array
    {
        $statement = $this->database->pdo->prepare(<<<'SQL'
            SELECT * FROM creations WHERE status = 'approved'
            ORDER BY slug IS NULL, CASE WHEN slug IS NULL THEN -approved_at ELSE id END
            LIMIT ? OFFSET ?
            SQL);
        $statement->bindValue(1, $limit, PDO::PARAM_INT);
        $statement->bindValue(2, $offset, PDO::PARAM_INT);
        $statement->execute();
        return array_map(self::present(...), $statement->fetchAll());
    }

    public function publishedCount(): int
    {
        $count = $this->database->pdo->query("SELECT COUNT(*) FROM creations WHERE status = 'approved'");
        return $count === false ? 0 : (int) $count->fetchColumn();
    }

    /** @return list<array<string, mixed>> Oldest first, so the admin reviews in order. */
    public function pending(): array
    {
        $statement = $this->database->pdo->query(
            "SELECT * FROM creations WHERE status = 'pending' ORDER BY submitted_at, id",
        );
        return $statement === false ? [] : array_map(self::present(...), $statement->fetchAll());
    }

    public function submit(Submission $submission): int
    {
        $this->database->pdo->prepare(<<<'SQL'
            INSERT INTO creations (title, description, author, data, status, submitted_at)
            VALUES (?, ?, ?, ?, 'pending', ?)
            SQL)->execute([
            $submission->title,
            $submission->description,
            $submission->author,
            $submission->data,
            self::now(),
        ]);
        return (int) $this->database->pdo->lastInsertId();
    }

    /** Adds a built-in creation unless one with the slug exists; returns whether it was added. */
    public function seed(string $slug, string $title, string $description, string $author, string $data): bool
    {
        $now = self::now();
        $statement = $this->database->pdo->prepare(<<<'SQL'
            INSERT OR IGNORE INTO creations
                (slug, title, description, author, data, status, submitted_at, approved_at)
            VALUES (?, ?, ?, ?, ?, 'approved', ?, ?)
            SQL);
        $statement->execute([$slug, $title, $description, $author, $data, $now, $now]);
        return $statement->rowCount() > 0;
    }

    public function approve(int $id): void
    {
        $statement = $this->database->pdo->prepare(
            "UPDATE creations SET status = 'approved', approved_at = ? WHERE id = ? AND status = 'pending'",
        );
        $statement->execute([self::now(), $id]);
        if ($statement->rowCount() === 0) {
            throw new HttpError(404, 'not_found');
        }
    }

    /** Rejects a pending creation or takes down a published one. */
    public function delete(int $id): void
    {
        $statement = $this->database->pdo->prepare('DELETE FROM creations WHERE id = ?');
        $statement->execute([$id]);
        if ($statement->rowCount() === 0) {
            throw new HttpError(404, 'not_found');
        }
    }

    /**
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    private static function present(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'title' => $row['title'],
            'description' => $row['description'],
            'author' => $row['author'],
            'builtIn' => $row['slug'] !== null,
            'submittedAt' => (int) $row['submitted_at'],
            'approvedAt' => $row['approved_at'] === null ? null : (int) $row['approved_at'],
            'data' => $row['data'],
        ];
    }

    /** Milliseconds, like JavaScript timestamps. */
    private static function now(): int
    {
        return (int) floor(microtime(true) * 1000);
    }
}
