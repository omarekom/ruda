<?php

// Local development only: the admin password is "admin".
return [
    'database_path' => __DIR__ . '/data/dev.sqlite',
    'admin_password_hash' => password_hash('admin', PASSWORD_DEFAULT),
    'secret' => 'development-only-secret',
];
