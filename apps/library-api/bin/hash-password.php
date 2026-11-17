<?php

declare(strict_types=1);

// Prints a hash of the admin password for config.php.
// Usage: php bin/hash-password.php

fwrite(STDOUT, 'Admin password: ');
$password = trim((string) fgets(STDIN));
if ($password === '') {
    fwrite(STDERR, "The password must not be empty\n");
    exit(1);
}
echo password_hash($password, PASSWORD_DEFAULT) . "\n";
