<?php
// Script de test pour vérifier la configuration mail
// À SUPPRIMER après les tests !

require_once 'config.php';

echo "<h1>Test de Configuration Mail - SAM Athlétisme</h1>";
echo "<p>Date: " . date('Y-m-d H:i:s') . "</p>";

// Test 1: Configuration de base
echo "<h2>1. Configuration de base</h2>";
echo "<ul>";
echo "<li>FROM_EMAIL: " . FROM_EMAIL . "</li>";
echo "<li>FROM_NAME: " . FROM_NAME . "</li>";
echo "<li>ADMIN_EMAIL: " . ADMIN_EMAIL . "</li>";
echo "<li>PHP Version: " . phpversion() . "</li>";
echo "<li>Timezone: " . date_default_timezone_get() . "</li>";
echo "</ul>";

// Test 2: Fonction mail() disponible
echo "<h2>2. Fonction mail() disponible</h2>";
if (function_exists('mail')) {
    echo "<p style='color: green;'>✅ Fonction mail() disponible</p>";
} else {
    echo "<p style='color: red;'>❌ Fonction mail() non disponible</p>";
    exit();
}

// Test 3: Configuration PHP mail
echo "<h2>3. Configuration PHP mail</h2>";
echo "<ul>";
echo "<li>sendmail_from: " . ini_get('sendmail_from') . "</li>";
echo "<li>SMTP: " . ini_get('SMTP') . "</li>";
echo "<li>smtp_port: " . ini_get('smtp_port') . "</li>";
echo "<li>sendmail_path: " . ini_get('sendmail_path') . "</li>";
echo "</ul>";

// Test 4: Test d'envoi simple
echo "<h2>4. Test d'envoi simple</h2>";

$testEmail = "test@example.com"; // Changez par votre email pour tester
$testSubject = "Test SAM Athlétisme - " . date('Y-m-d H:i:s');
$testMessage = "Ceci est un test de la fonction mail() du serveur.\n\nSi vous recevez ce message, la configuration fonctionne correctement.";

$headers = [
    "From: " . FROM_NAME . " <" . FROM_EMAIL . ">",
    "Reply-To: " . FROM_EMAIL,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "X-Mailer: PHP/" . phpversion()
];

$headerString = implode("\r\n", $headers);

echo "<p>Envoi vers: <strong>$testEmail</strong></p>";
echo "<p>Sujet: <strong>$testSubject</strong></p>";

$result = mail($testEmail, $testSubject, $testMessage, $headerString);

if ($result) {
    echo "<p style='color: green;'>✅ Email envoyé avec succès !</p>";
    echo "<p>Vérifiez votre boîte mail (et les spams).</p>";
} else {
    echo "<p style='color: red;'>❌ Échec de l'envoi</p>";
    
    $error = error_get_last();
    if ($error) {
        echo "<p>Dernière erreur PHP: " . $error['message'] . "</p>";
    }
}

// Test 5: Test avec HTML
echo "<h2>5. Test avec contenu HTML</h2>";

$htmlMessage = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Test HTML</title>
</head>
<body>
    <h1>Test HTML - SAM Athlétisme</h1>
    <p>Ceci est un test avec du contenu <strong>HTML</strong>.</p>
    <p>Date: ' . date('Y-m-d H:i:s') . '</p>
    <p style="color: blue;">Si vous voyez ce texte en bleu, le HTML fonctionne.</p>
</body>
</html>';

$htmlHeaders = [
    "From: " . FROM_NAME . " <" . FROM_EMAIL . ">",
    "Reply-To: " . FROM_EMAIL,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "X-Mailer: PHP/" . phpversion()
];

$htmlHeaderString = implode("\r\n", $htmlHeaders);
$htmlResult = mail($testEmail, "Test HTML - " . date('H:i:s'), $htmlMessage, $htmlHeaderString);

if ($htmlResult) {
    echo "<p style='color: green;'>✅ Email HTML envoyé avec succès !</p>";
} else {
    echo "<p style='color: red;'>❌ Échec de l'envoi HTML</p>";
}

// Test 6: Vérification des logs
echo "<h2>6. Vérification des logs</h2>";

$logDir = __DIR__ . '/logs';
if (is_dir($logDir)) {
    echo "<p style='color: green;'>✅ Dossier logs existe</p>";
    
    if (is_writable($logDir)) {
        echo "<p style='color: green;'>✅ Dossier logs accessible en écriture</p>";
        
        // Test d'écriture
        $testLogFile = $logDir . '/test.log';
        $testLogContent = date('Y-m-d H:i:s') . " - Test d'écriture de log\n";
        
        if (file_put_contents($testLogFile, $testLogContent, FILE_APPEND | LOCK_EX)) {
            echo "<p style='color: green;'>✅ Écriture de log réussie</p>";
            
            // Nettoyage
            if (file_exists($testLogFile)) {
                unlink($testLogFile);
            }
        } else {
            echo "<p style='color: red;'>❌ Échec de l'écriture de log</p>";
        }
    } else {
        echo "<p style='color: red;'>❌ Dossier logs non accessible en écriture</p>";
        echo "<p>Exécutez: <code>chmod 755 " . $logDir . "</code></p>";
    }
} else {
    echo "<p style='color: orange;'>⚠️ Dossier logs n'existe pas, il sera créé automatiquement</p>";
}

echo "<hr>";
echo "<p><strong>Instructions:</strong></p>";
echo "<ol>";
echo "<li>Changez l'email de test dans ce script</li>";
echo "<li>Vérifiez votre boîte mail (et les spams)</li>";
echo "<li>Si ça ne fonctionne pas, contactez votre hébergeur</li>";
echo "<li><strong>SUPPRIMEZ ce fichier après les tests !</strong></li>";
echo "</ol>";

echo "<p style='color: red; font-weight: bold;'>⚠️ IMPORTANT: Supprimez ce fichier test-mail.php après utilisation pour des raisons de sécurité !</p>";
?>