<?php
// Configuration principale du formulaire SAM Athlétisme

// Email de réception des demandes
define('ADMIN_EMAIL', 'secretariat@sam-athletisme.fr');

// Email d'envoi (IMPORTANT: doit être sur votre domaine pour éviter les problèmes de spam)
define('FROM_EMAIL', 'noreply@scarbonk.fr');
define('FROM_NAME', 'SAM Athlétisme - Formulaire');

// Configuration PHP pour l'envoi d'emails
ini_set('sendmail_from', FROM_EMAIL);

// Taille maximale des fichiers (en bytes) - 5MB par défaut
define('MAX_FILE_SIZE', 5 * 1024 * 1024);

// Types de fichiers autorisés
define('ALLOWED_FILE_TYPES', [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

// Configuration des logs
define('LOG_RETENTION_DAYS', 30); // Garder les logs 30 jours

// Timezone
date_default_timezone_set('Europe/Paris');

// Configuration d'erreur PHP pour la production
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/logs/php_errors.log');

// Configuration mail() PHP
ini_set('SMTP', 'localhost');
ini_set('smtp_port', 25);

// Fonction pour tester la configuration mail
function testMailConfiguration() {
    $testEmail = 'test@example.com';
    $testSubject = 'Test de configuration - ' . date('Y-m-d H:i:s');
    $testMessage = 'Ceci est un test de la configuration mail du serveur.';
    
    $headers = [
        'From: ' . FROM_NAME . ' <' . FROM_EMAIL . '>',
        'Reply-To: ' . FROM_EMAIL,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8'
    ];
    
    return mail($testEmail, $testSubject, $testMessage, implode("\r\n", $headers));
}
?>