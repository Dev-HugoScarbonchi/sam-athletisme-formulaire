<?php
/**
 * Configuration du gestionnaire de formulaire
 * Copiez ce fichier en config.local.php et modifiez les valeurs
 */

// Configuration email
define('ADMIN_EMAIL', 'dev@hugoscarbonchi.fr');
define('FROM_EMAIL', 'noreply@votre-domaine.fr'); // Remplacez par votre domaine
define('FROM_NAME', 'SAM Athlétisme - Formulaire automatisé');

// Configuration de sécurité
define('ALLOWED_ORIGINS', [
    'https://scarbonk.fr',
    'https://www.scarbonk.fr',
    'https://sam-athletisme-formulaire.vercel.app',
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
define('LOG_FILE', __DIR__ . '/logs/form-submissions.log');
define('ERROR_LOG_FILE', __DIR__ . '/logs/errors.log');

// Créer le dossier de logs s'il n'existe pas
if (!file_exists(__DIR__ . '/logs')) {
    mkdir(__DIR__ . '/logs', 0755, true);
}
?>