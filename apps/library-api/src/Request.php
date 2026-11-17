<?php

declare(strict_types=1);

namespace Ruda\Library;

final class Request
{
    /**
     * @param array<string, string> $query
     */
    public function __construct(
        public readonly string $method,
        /** The route after api.php, e.g. "/creations". */
        public readonly string $path,
        public readonly array $query,
        public readonly string $body,
        public readonly string $clientAddress,
        /** Whether the request carries the header only the Ruda app sends. */
        public readonly bool $fromApp,
        public readonly bool $secure,
    ) {
    }

    public static function fromGlobals(): self
    {
        $query = [];
        foreach ($_GET as $key => $value) {
            if (is_string($key) && is_string($value)) {
                $query[$key] = $value;
            }
        }
        return new self(
            strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')),
            rtrim((string) ($_SERVER['PATH_INFO'] ?? '/'), '/') ?: '/',
            $query,
            (string) file_get_contents('php://input'),
            (string) ($_SERVER['REMOTE_ADDR'] ?? ''),
            ($_SERVER['HTTP_X_RUDA_LIBRARY'] ?? '') === '1',
            ($_SERVER['HTTPS'] ?? '') !== '' && ($_SERVER['HTTPS'] ?? '') !== 'off',
        );
    }

    /** @return array<mixed> */
    public function json(): array
    {
        $data = json_decode($this->body, true, 8);
        if (!is_array($data)) {
            throw new HttpError(400, 'invalid_request');
        }
        return $data;
    }
}
