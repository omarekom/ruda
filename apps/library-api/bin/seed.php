<?php

declare(strict_types=1);

// Adds the built-in creations from seed/creations.json; existing ones are left untouched.
// Usage: php bin/seed.php

spl_autoload_register(static function (string $class): void {
    $prefix = 'Ruda\\Library\\';
    if (str_starts_with($class, $prefix)) {
        require dirname(__DIR__) . '/src/' . substr($class, strlen($prefix)) . '.php';
    }
});

use Ruda\Library\Config;
use Ruda\Library\Creations;
use Ruda\Library\Database;

$entries = json_decode((string) file_get_contents(dirname(__DIR__) . '/seed/creations.json'), true, 16);
if (!is_array($entries)) {
    fwrite(STDERR, "seed/creations.json is not valid\n");
    exit(1);
}
$creations = new Creations(new Database(Config::load()->databasePath));
foreach ($entries as $entry) {
    $added = $creations->seed($entry['slug'], $entry['title'], $entry['description'], $entry['author'], $entry['data']);
    echo ($added ? 'added   ' : 'exists  ') . $entry['slug'] . "\n";
}
