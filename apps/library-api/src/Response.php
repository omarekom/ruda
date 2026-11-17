<?php

declare(strict_types=1);

namespace Ruda\Library;

final class Response
{
    /** @param array<mixed>|null $body */
    public function __construct(
        public readonly int $status,
        public readonly ?array $body = null,
    ) {
    }

    public static function noContent(): self
    {
        return new self(204);
    }

    public function send(): void
    {
        http_response_code($this->status);
        header('Cache-Control: no-store');
        header('X-Content-Type-Options: nosniff');
        if ($this->body !== null) {
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode($this->body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        }
    }
}
