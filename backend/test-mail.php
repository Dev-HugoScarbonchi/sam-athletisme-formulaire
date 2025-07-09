<?php
/**
 * Script de test pour diagnostiquer les problèmes d'envoi d'email
 * À SUPPRIMER après les tests pour des raisons de sécurité !
 */

require_once 'config.php';

echo "<h1>🧪 Test de Configuration Mail - SAM Athlétisme</h1>";
echo "<p>Date: " . date('Y-m-d H:i:s') . "</p>";
echo "<hr>";

// Test 1: Configuration de base
echo "<h2>1. ⚙️ Configuration de base</h2>";
echo "<ul>";
echo "<li><strong>FROM_EMAIL:</strong> " . FROM_EMAIL . "</li>";
echo "<li><strong>FROM_NAME:</strong> " . FROM_NAME . "</li>";
echo "<li><strong>ADMIN_EMAIL:</strong> " . ADMIN_EMAIL . "</li>";
echo "<li><strong>PHP Version:</strong> " . phpversion() . "</li>";
echo "<li><strong>Timezone:</strong> " . date_default_timezone_get() . "</li>";
echo "<li><strong>Server:</strong> " . ($_SERVER['SERVER_SOFTWARE'] ?? 'Inconnu') . "</li>";
echo "</ul>";

// Test 2: Fonction mail() disponible
echo "<h2>2. 📧 Fonction mail() disponible</h2>";
if (function_exists('mail')) {
    echo "<p style='color: green;'>✅ Fonction mail() disponible</p>";
} else {
    echo "<p style='color: red;'>❌ Fonction mail() non disponible</p>";
    echo "<p><strong>Solution:</strong> Contactez votre hébergeur pour activer la fonction mail()</p>";
    exit();
}

// Test 3: Configuration PHP mail
echo "<h2>3. 🔧 Configuration PHP mail</h2>";
echo "<ul>";
echo "<li><strong>sendmail_from:</strong> " . (ini_get('sendmail_from') ?: 'Non défini') . "</li>";
echo "<li><strong>SMTP:</strong> " . (ini_get('SMTP') ?: 'Non défini') . "</li>";
echo "<li><strong>smtp_port:</strong> " . (ini_get('smtp_port') ?: 'Non défini') . "</li>";
echo "<li><strong>sendmail_path:</strong> " . (ini_get('sendmail_path') ?: 'Non défini') . "</li>";
echo "</ul>";

// Test 4: Permissions des dossiers
echo "<h2>4. 📁 Permissions des dossiers</h2>";
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
        echo "<p><strong>Solution:</strong> Exécutez: <code>chmod 755 " . $logDir . "</code></p>";
    }
} else {
    echo "<p style='color: orange;'>⚠️ Dossier logs n'existe pas, il sera créé automatiquement</p>";
}

// Test 5: Test d'envoi simple
echo "<h2>5. 📤 Test d'envoi simple</h2>";

$testSubject = "Test SAM Athlétisme - " . date('Y-m-d H:i:s');
$testMessage = "Ceci est un test de la fonction mail() du serveur SAM Athlétisme.\n\nSi vous recevez ce message, la configuration fonctionne correctement.\n\nDétails du test:\n- Date: " . date('Y-m-d H:i:s') . "\n- Serveur: " . ($_SERVER['SERVER_NAME'] ?? 'Inconnu') . "\n- IP: " . ($_SERVER['SERVER_ADDR'] ?? 'Inconnue');

$headers = [
    "From: " . FROM_NAME . " <" . FROM_EMAIL . ">",
    "Reply-To: " . FROM_EMAIL,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "X-Mailer: PHP/" . phpversion()
];

$headerString = implode("\r\n", $headers);

echo "<p><strong>Envoi vers:</strong> " . ADMIN_EMAIL . "</p>";
echo "<p><strong>Sujet:</strong> " . htmlspecialchars($testSubject) . "</p>";

$result = mail(ADMIN_EMAIL, $testSubject, $testMessage, $headerString);

if ($result) {
    echo "<p style='color: green;'>✅ Email simple envoyé avec succès !</p>";
    echo "<p>Vérifiez votre boîte mail (et les spams).</p>";
} else {
    echo "<p style='color: red;'>❌ Échec de l'envoi simple</p>";
    
    $error = error_get_last();
    if ($error) {
        echo "<p><strong>Dernière erreur PHP:</strong> " . htmlspecialchars($error['message']) . "</p>";
    }
}

// Test 6: Test avec HTML
echo "<h2>6. 🎨 Test avec contenu HTML</h2>";

$htmlMessage = '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Test HTML SAM</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: linear-gradient(135deg, #2563eb, #dc2626); color: white; padding: 20px; border-radius: 8px; }
        .content { background: #f8fafc; padding: 20px; border-radius: 8px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏃‍♂️ Test HTML - SAM Athlétisme</h1>
        <p>Test de la configuration email avec contenu HTML</p>
    </div>
    <div class="content">
        <p>Ceci est un test avec du contenu <strong>HTML</strong>.</p>
        <p><strong>Date:</strong> ' . date('Y-m-d H:i:s') . '</p>
        <p><strong>Serveur:</strong> ' . ($_SERVER['SERVER_NAME'] ?? 'Inconnu') . '</p>
        <p style="color: #2563eb;">Si vous voyez ce texte en bleu, le HTML fonctionne parfaitement.</p>
        <ul>
            <li>✅ Configuration PHP OK</li>
            <li>✅ Fonction mail() OK</li>
            <li>✅ Headers HTML OK</li>
        </ul>
    </div>
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
$htmlResult = mail(ADMIN_EMAIL, "Test HTML SAM - " . date('H:i:s'), $htmlMessage, $htmlHeaderString);

if ($htmlResult) {
    echo "<p style='color: green;'>✅ Email HTML envoyé avec succès !</p>";
} else {
    echo "<p style='color: red;'>❌ Échec de l'envoi HTML</p>";
}

// Test 7: Informations système
echo "<h2>7. 💻 Informations système</h2>";
echo "<ul>";
echo "<li><strong>OS:</strong> " . php_uname() . "</li>";
echo "<li><strong>Memory Limit:</strong> " . ini_get('memory_limit') . "</li>";
echo "<li><strong>Max Execution Time:</strong> " . ini_get('max_execution_time') . "s</li>";
echo "<li><strong>Upload Max Filesize:</strong> " . ini_get('upload_max_filesize') . "</li>";
echo "<li><strong>Post Max Size:</strong> " . ini_get('post_max_size') . "</li>";
echo "</ul>";

echo "<hr>";
echo "<h2>📋 Instructions</h2>";
echo "<ol>";
echo "<li>Vérifiez votre boîte mail (et les spams) pour les emails de test</li>";
echo "<li>Si aucun email n'est reçu, contactez votre hébergeur</li>";
echo "<li>Vérifiez que l'adresse FROM_EMAIL existe sur votre domaine</li>";
echo "<li><strong style='color: red;'>SUPPRIMEZ ce fichier test-mail.php après utilisation !</strong></li>";
echo "</ol>";

echo "<div style='background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;'>";
echo "<h3>⚠️ Conseils pour résoudre les problèmes d'email :</h3>";
echo "<ul>";
echo "<li><strong>Email non reçu :</strong> Vérifiez les spams, contactez l'hébergeur</li>";
echo "<li><strong>FROM_EMAIL invalide :</strong> Utilisez une adresse de votre domaine (noreply@scarbonk.fr)</li>";
echo "<li><strong>Fonction mail() désactivée :</strong> Contactez l'hébergeur pour l'activer</li>";
echo "<li><strong>Serveur SMTP externe :</strong> Considérez l'utilisation de PHPMailer avec SMTP</li>";
echo "</ul>";
echo "</div>";

echo "<p style='color: red; font-weight: bold; font-size: 1.2em;'>🚨 IMPORTANT: Supprimez ce fichier test-mail.php après utilisation pour des raisons de sécurité !</p>";
?>