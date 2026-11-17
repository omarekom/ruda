<?php

declare(strict_types=1);

namespace Ruda\Library;

use RuntimeException;

/** Ends a request with an error code the app translates; `field` names an invalid input. */
final class HttpError extends RuntimeException
{
    public function __construct(
        public readonly int $status,
        public readonly string $errorCode,
        public readonly ?string $field = null,
    ) {
        parent::__construct($errorCode);
    }

    public function toResponse(): Response
    {
        $body = ['error' => $this->errorCode];
        if ($this->field !== null) {
            $body['field'] = $this->field;
        }
        return new Response($this->status, $body);
    }
}
