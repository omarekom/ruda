<?php

declare(strict_types=1);

namespace Ruda\Library;

/** A validated creation sent by a player. */
final class Submission
{
    public const MAX_TITLE = 80;
    public const MAX_DESCRIPTION = 500;
    public const MAX_AUTHOR = 40;
    public const MAX_DATA_BYTES = 256 * 1024;
    public const MAX_BLOCKS = 50000;

    private function __construct(
        public readonly string $title,
        public readonly string $description,
        public readonly string $author,
        public readonly string $data,
    ) {
    }

    /** @param array<mixed> $input */
    public static function fromInput(array $input): self
    {
        // Bots fill in every field, including this one that the app keeps hidden.
        if (($input['website'] ?? '') !== '') {
            throw new HttpError(400, 'invalid_request');
        }
        $data = $input['data'] ?? null;
        if (!is_string($data) || strlen($data) > self::MAX_DATA_BYTES || !self::looksLikeWorld($data)) {
            throw new HttpError(400, 'invalid_field', 'data');
        }
        return new self(
            self::text($input, 'title', 1, self::MAX_TITLE),
            self::text($input, 'description', 0, self::MAX_DESCRIPTION),
            self::text($input, 'author', 1, self::MAX_AUTHOR),
            $data,
        );
    }

    /** @param array<mixed> $input */
    private static function text(array $input, string $field, int $min, int $max): string
    {
        $value = $input[$field] ?? '';
        if (!is_string($value) || !mb_check_encoding($value, 'UTF-8')) {
            throw new HttpError(400, 'invalid_field', $field);
        }
        // Line breaks are kept in descriptions only; other control characters never.
        $value = preg_replace($field === 'description' ? '/[^\P{C}\n]/u' : '/\p{C}/u', '', $value) ?? '';
        $value = trim($value);
        $length = mb_strlen($value);
        if ($length < $min || $length > $max) {
            throw new HttpError(400, 'invalid_field', $field);
        }
        return $value;
    }

    /**
     * Checks the shape of a .ruda file. The app does the full validation (block names, states)
     * when it loads the world; the admin preview shows any problem before approval.
     */
    private static function looksLikeWorld(string $data): bool
    {
        $file = json_decode($data, true, 4);
        if (!is_array($file) || !is_int($file['rudaversion'] ?? null) || $file['rudaversion'] < 1) {
            return false;
        }
        if (!is_string($file['name'] ?? null) || !is_array($file['blocks'] ?? null)) {
            return false;
        }
        $cells = 0;
        foreach ($file['blocks'] as $key => $coordinates) {
            if (!is_string($key) || preg_match('/^[a-z_]+(:[a-z0-9]+)*$/', $key) !== 1) {
                return false;
            }
            if (!is_array($coordinates) || !array_is_list($coordinates) || count($coordinates) % 2 !== 0) {
                return false;
            }
            foreach ($coordinates as $value) {
                if (!is_int($value)) {
                    return false;
                }
            }
            $cells += count($coordinates) / 2;
        }
        return $cells <= self::MAX_BLOCKS;
    }
}
