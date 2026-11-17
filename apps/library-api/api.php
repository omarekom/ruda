<?php

declare(strict_types=1);

// Entry point of the library API. Requests arrive as /api.php/<route>.

spl_autoload_register(static function (string $class): void {
    $prefix = 'Ruda\\Library\\';
    if (str_starts_with($class, $prefix)) {
        require __DIR__ . '/src/' . substr($class, strlen($prefix)) . '.php';
    }
});

use Ruda\Library\Api;
use Ruda\Library\Config;
use Ruda\Library\Request;

$config = Config::load();
(new Api($config))->handle(Request::fromGlobals())->send();
