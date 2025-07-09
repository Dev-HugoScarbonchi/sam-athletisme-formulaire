<?php
/**
 * Configuration du gestionnaire de formulaire SAM Athlétisme
 * Version améliorée avec diagnostics
 */

// Configuration email
define('ADMIN_EMAIL', 'dev@hugoscarbonchi.fr');
define('FROM_EMAIL', 'noreply@scarbonk.fr'); // Utilise votre domaine
define('FROM_NAME', 'SAM Athlétisme - Formulaire automatisé');

// Configuration de sécurité
define('ALLOWED_ORIGINS', [
    'https://scarbonk.fr',
    'https://www.scarbonk.fr',
    'https://sam-athletisme-formulaire.vercel.app',
    'https://sam-athletisme.vercel.app',
    'https://*.vercel.app', // Pour tous vos déploiements Vercel
    'http://localhost:5173', // Pour le développement
    'http://127.0.0.1:5173'  // Pour le développement
]);

// Taille maximale des fichiers (en octets)
define('MAX_FILE_SIZE', 50 * 1024 * 1024); // 50MB

// Types de fichiers autorisés
define('ALLOWED_FILE_TYPES', [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
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
ini_set('sendmail_from', FROM_EMAIL);

// Fonction pour tester la configuration mail
function testMailConfiguration() {
    $testEmail = ADMIN_EMAIL;
    $testSubject = 'Test de configuration SAM - ' . date('Y-m-d H:i:s');
    $testMessage = 'Ceci est un test de la configuration mail du serveur SAM Athlétisme.';
    
    $headers = [
        'From: ' . FROM_NAME . ' <' . FROM_EMAIL . '>',
        'Reply-To: ' . FROM_EMAIL,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8'
    ];
    
    return mail($testEmail, $testSubject, $testMessage, implode("\r\n", $headers));
}

// Fonction pour nettoyer les anciens logs
function cleanOldLogs() {
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) return;
    
    $files = glob($logDir . '/*.log');
    $cutoffTime = time() - (LOG_RETENTION_DAYS * 24 * 60 * 60);
    
    foreach ($files as $file) {
        if (filemtime($file) < $cutoffTime) {
            unlink($file);
        }
    }
}

// Créer le dossier de logs s'il n'existe pas
$logDir = __DIR__ . '/logs';
if (!file_exists($logDir)) {
    mkdir($logDir, 0755, true);
}

// Nettoyer les anciens logs (appelé occasionnellement)
if (rand(1, 100) === 1) {
    cleanOldLogs();
}
?>