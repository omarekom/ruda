<?php

// Copy to config.php and fill in. Never commit config.php.
return [
    // Keep the database outside the web root if your hosting allows it.
    'database_path' => __DIR__ . '/data/library.sqlite',
    // Create with: php bin/hash-password.php
    'admin_password_hash' => '',
    // Any long random string, e.g. from: php -r "echo bin2hex(random_bytes(32));"
    'secret' => '',
];
