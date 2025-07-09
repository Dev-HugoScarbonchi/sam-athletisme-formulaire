<?php
header('Content-Type: application/json; charset=utf-8');

// Configuration CORS
$allowed_origins = [
    'https://sam-athletisme.vercel.app',
    'https://sam-athletisme-formulaire.vercel.app',
    'https://localhost:5173',
    'http://localhost:5173',
    'https://scarbonk.fr'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
}

header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 86400');

// Gestion des requêtes OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Vérification de la méthode
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Méthode non autorisée']);
    exit();
}

// Configuration
require_once 'config.php';

// Fonction de logging améliorée
function logMessage($message, $level = 'INFO') {
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    $timestamp = date('Y-m-d H:i:s');
    $logFile = $logDir . '/form-handler.log';
    $logEntry = "[$timestamp] [$level] $message" . PHP_EOL;
    
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
    
    // Log séparé pour les erreurs
    if ($level === 'ERROR') {
        $errorFile = $logDir . '/errors.log';
        file_put_contents($errorFile, $logEntry, FILE_APPEND | LOCK_EX);
    }
}

// Fonction pour valider les emails
function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

// Fonction pour nettoyer les données
function sanitizeInput($data) {
    return htmlspecialchars(strip_tags(trim($data)), ENT_QUOTES, 'UTF-8');
}

// Fonction pour générer un boundary unique
function generateBoundary() {
    return '----=_NextPart_' . md5(uniqid(time()));
}

// Fonction pour encoder en base64 par chunks
function base64EncodeChunked($data) {
    return chunk_split(base64_encode($data));
}

// Fonction principale d'envoi d'email avec pièces jointes
function sendEmailWithAttachments($to, $subject, $message, $attachments = []) {
    logMessage("Début de l'envoi d'email vers: $to");
    
    // Validation de l'email destinataire
    if (!isValidEmail($to)) {
        logMessage("Email destinataire invalide: $to", 'ERROR');
        return false;
    }
    
    // Configuration de l'expéditeur
    $from = FROM_EMAIL;
    $fromName = FROM_NAME;
    
    if (!isValidEmail($from)) {
        logMessage("Email expéditeur invalide: $from", 'ERROR');
        return false;
    }
    
    // Génération du boundary
    $boundary = generateBoundary();
    
    // Headers de base
    $headers = [
        "From: $fromName <$from>",
        "Reply-To: $from",
        "MIME-Version: 1.0",
        "Content-Type: multipart/mixed; boundary=\"$boundary\"",
        "X-Mailer: PHP/" . phpversion(),
        "X-Priority: 3",
        "Date: " . date('r')
    ];
    
    // Construction du corps du message
    $body = "--$boundary\r\n";
    $body .= "Content-Type: text/html; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $body .= $message . "\r\n\r\n";
    
    // Ajout des pièces jointes
    foreach ($attachments as $attachment) {
        if (!isset($attachment['name']) || !isset($attachment['content']) || !isset($attachment['type'])) {
            logMessage("Pièce jointe invalide ignorée", 'WARNING');
            continue;
        }
        
        $filename = $attachment['name'];
        $content = $attachment['content'];
        $mimeType = $attachment['type'];
        
        logMessage("Ajout de la pièce jointe: $filename ($mimeType)");
        
        $body .= "--$boundary\r\n";
        $body .= "Content-Type: $mimeType; name=\"$filename\"\r\n";
        $body .= "Content-Transfer-Encoding: base64\r\n";
        $body .= "Content-Disposition: attachment; filename=\"$filename\"\r\n\r\n";
        $body .= base64EncodeChunked($content) . "\r\n";
    }
    
    $body .= "--$boundary--\r\n";
    
    // Envoi de l'email
    $headerString = implode("\r\n", $headers);
    
    logMessage("Tentative d'envoi avec " . count($attachments) . " pièce(s) jointe(s)");
    
    $result = mail($to, $subject, $body, $headerString);
    
    if ($result) {
        logMessage("Email envoyé avec succès vers: $to");
        return true;
    } else {
        $error = error_get_last();
        logMessage("Échec de l'envoi d'email vers: $to. Erreur: " . ($error['message'] ?? 'Inconnue'), 'ERROR');
        return false;
    }
}

// Fonction pour traiter les fichiers uploadés
function processUploadedFiles() {
    $attachments = [];
    
    if (!isset($_FILES) || empty($_FILES)) {
        logMessage("Aucun fichier uploadé");
        return $attachments;
    }
    
    foreach ($_FILES as $fieldName => $file) {
        if (is_array($file['name'])) {
            // Fichiers multiples
            for ($i = 0; $i < count($file['name']); $i++) {
                if ($file['error'][$i] === UPLOAD_ERR_OK) {
                    $attachments[] = [
                        'name' => sanitizeInput($file['name'][$i]),
                        'content' => file_get_contents($file['tmp_name'][$i]),
                        'type' => $file['type'][$i],
                        'size' => $file['size'][$i]
                    ];
                    logMessage("Fichier traité: " . $file['name'][$i] . " (" . $file['size'][$i] . " bytes)");
                } else {
                    logMessage("Erreur upload fichier " . $file['name'][$i] . ": " . $file['error'][$i], 'WARNING');
                }
            }
        } else {
            // Fichier unique
            if ($file['error'] === UPLOAD_ERR_OK) {
                $attachments[] = [
                    'name' => sanitizeInput($file['name']),
                    'content' => file_get_contents($file['tmp_name']),
                    'type' => $file['type'],
                    'size' => $file['size']
                ];
                logMessage("Fichier traité: " . $file['name'] . " (" . $file['size'] . " bytes)");
            } else {
                logMessage("Erreur upload fichier " . $file['name'] . ": " . $file['error'], 'WARNING');
            }
        }
    }
    
    logMessage("Total fichiers traités: " . count($attachments));
    return $attachments;
}

// Fonction pour créer le contenu HTML de l'email
function createEmailContent($formData) {
    $html = '<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Demande de remboursement - SAM Athlétisme</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .section { margin-bottom: 20px; padding: 15px; border: 1px solid #e9ecef; border-radius: 5px; }
        .section h3 { margin-top: 0; color: #495057; border-bottom: 2px solid #007bff; padding-bottom: 5px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .info-item { padding: 5px 0; }
        .info-label { font-weight: bold; color: #495057; }
        .expenses-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .expenses-table th, .expenses-table td { border: 1px solid #dee2e6; padding: 8px; text-align: left; }
        .expenses-table th { background-color: #f8f9fa; font-weight: bold; }
        .total-row { background-color: #e9ecef; font-weight: bold; }
        .footer { margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 5px; font-size: 0.9em; color: #6c757d; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏃‍♂️ Nouvelle demande de remboursement</h1>
        <p><strong>SAM Athlétisme Mérignacais</strong></p>
        <p>Reçue le ' . date('d/m/Y à H:i') . '</p>
    </div>

    <div class="section">
        <h3>👤 Informations du demandeur</h3>
        <div class="info-grid">
            <div class="info-item"><span class="info-label">Nom :</span> ' . htmlspecialchars($formData['lastName']) . '</div>
            <div class="info-item"><span class="info-label">Prénom :</span> ' . htmlspecialchars($formData['firstName']) . '</div>
            <div class="info-item"><span class="info-label">Rôle :</span> ' . htmlspecialchars($formData['role']) . '</div>
            <div class="info-item"><span class="info-label">Lieu :</span> ' . htmlspecialchars($formData['place']) . '</div>
            <div class="info-item"><span class="info-label">Date :</span> ' . htmlspecialchars($formData['date']) . '</div>
            <div class="info-item"><span class="info-label">Mode de paiement :</span> ' . htmlspecialchars($formData['paymentMethod']) . '</div>
        </div>
    </div>

    <div class="section">
        <h3>📋 Détails de la demande</h3>
        <div class="info-item"><span class="info-label">Objet :</span> ' . htmlspecialchars($formData['subject']) . '</div>
        <div class="info-item"><span class="info-label">Motivation :</span></div>
        <p style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin-top: 5px;">' . nl2br(htmlspecialchars($formData['motivation'])) . '</p>
    </div>';

    // Dépenses
    if (!empty($formData['expenses'])) {
        $html .= '<div class="section">
            <h3>💰 Détail des dépenses</h3>
            <table class="expenses-table">
                <thead>
                    <tr>
                        <th>Nature de la dépense</th>
                        <th>Montant (€)</th>
                        <th>Justificatifs</th>
                    </tr>
                </thead>
                <tbody>';
        
        $totalExpenses = 0;
        foreach ($formData['expenses'] as $expense) {
            if (!empty($expense['nature']) && !empty($expense['amount'])) {
                $amount = floatval($expense['amount']);
                $totalExpenses += $amount;
                
                $attachmentsList = '';
                if (!empty($expense['attachments'])) {
                    $attachmentsList = implode(', ', array_map('htmlspecialchars', $expense['attachments']));
                } else {
                    $attachmentsList = 'Aucun fichier';
                }
                
                $html .= '<tr>
                    <td>' . htmlspecialchars($expense['nature']) . '</td>
                    <td>' . number_format($amount, 2, ',', ' ') . ' €</td>
                    <td>' . $attachmentsList . '</td>
                </tr>';
            }
        }
        
        $html .= '<tr class="total-row">
                <td><strong>TOTAL DÉPENSES</strong></td>
                <td><strong>' . number_format($totalExpenses, 2, ',', ' ') . ' €</strong></td>
                <td></td>
            </tr>';
        
        $html .= '</tbody></table></div>';
    }

    // Remboursement kilométrique
    if (!empty($formData['kilometers']) && floatval($formData['kilometers']) > 0) {
        $kilometers = floatval($formData['kilometers']);
        $kilometricAmount = $kilometers * 0.321;
        
        $html .= '<div class="section">
            <h3>🚗 Remboursement kilométrique</h3>
            <div class="info-grid">
                <div class="info-item"><span class="info-label">Kilomètres :</span> ' . $kilometers . ' km</div>
                <div class="info-item"><span class="info-label">Taux :</span> 0,321 €/km</div>
                <div class="info-item"><span class="info-label">Véhicule de location :</span> ' . ($formData['rentalVehicle'] ? 'Oui' : 'Non') . '</div>
                <div class="info-item"><span class="info-label">Montant :</span> <strong>' . number_format($kilometricAmount, 2, ',', ' ') . ' €</strong></div>
            </div>
        </div>';
        
        $totalExpenses += $kilometricAmount;
    }

    // Total général
    $html .= '<div class="section" style="background: #e9ecef;">
        <h3>💵 MONTANT TOTAL DE LA DEMANDE</h3>
        <p style="font-size: 1.5em; font-weight: bold; color: #007bff; margin: 0;">' . number_format($totalExpenses, 2, ',', ' ') . ' €</p>
    </div>';

    $html .= '<div class="footer">
        <p><strong>📎 Pièces jointes :</strong> Fiche de remboursement PDF + justificatifs uploadés</p>
        <p><strong>⚠️ Important :</strong> Cette demande nécessite validation et signature du président.</p>
        <p><em>Email généré automatiquement par le système de gestion SAM Athlétisme</em></p>
    </div>

</body>
</html>';

    return $html;
}

try {
    logMessage("=== DÉBUT DU TRAITEMENT D'UNE NOUVELLE DEMANDE ===");
    logMessage("IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'Inconnue'));
    logMessage("User-Agent: " . ($_SERVER['HTTP_USER_AGENT'] ?? 'Inconnu'));
    
    // Récupération des données du formulaire
    $formData = [];
    foreach ($_POST as $key => $value) {
        $formData[$key] = sanitizeInput($value);
    }
    
    // Validation des champs obligatoires
    $requiredFields = ['firstName', 'lastName', 'role', 'place', 'date', 'subject', 'motivation', 'paymentMethod'];
    $missingFields = [];
    
    foreach ($requiredFields as $field) {
        if (empty($formData[$field])) {
            $missingFields[] = $field;
        }
    }
    
    if (!empty($missingFields)) {
        logMessage("Champs manquants: " . implode(', ', $missingFields), 'ERROR');
        http_response_code(400);
        echo json_encode(['error' => 'Champs obligatoires manquants: ' . implode(', ', $missingFields)]);
        exit();
    }
    
    // Traitement des dépenses (format JSON)
    $expenses = [];
    if (!empty($formData['expenses'])) {
        $expensesData = json_decode($formData['expenses'], true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($expensesData)) {
            $expenses = $expensesData;
        }
    }
    $formData['expenses'] = $expenses;
    
    logMessage("Demande de: " . $formData['firstName'] . " " . $formData['lastName']);
    logMessage("Objet: " . $formData['subject']);
    logMessage("Nombre de dépenses: " . count($expenses));
    
    // Traitement des fichiers uploadés
    $attachments = processUploadedFiles();
    
    // Création du contenu de l'email
    $emailContent = createEmailContent($formData);
    
    // Sujet de l'email
    $emailSubject = "🏃‍♂️ Demande de remboursement - " . $formData['firstName'] . " " . $formData['lastName'] . " - " . $formData['subject'];
    
    // Envoi de l'email
    $emailSent = sendEmailWithAttachments(ADMIN_EMAIL, $emailSubject, $emailContent, $attachments);
    
    if ($emailSent) {
        logMessage("=== DEMANDE TRAITÉE AVEC SUCCÈS ===");
        
        // Log de la soumission réussie
        $submissionLog = [
            'timestamp' => date('Y-m-d H:i:s'),
            'name' => $formData['firstName'] . ' ' . $formData['lastName'],
            'subject' => $formData['subject'],
            'attachments_count' => count($attachments),
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'Inconnue'
        ];
        
        $submissionLogFile = __DIR__ . '/logs/submissions.log';
        file_put_contents($submissionLogFile, json_encode($submissionLog) . PHP_EOL, FILE_APPEND | LOCK_EX);
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Demande envoyée avec succès',
            'attachments_processed' => count($attachments)
        ]);
    } else {
        logMessage("=== ÉCHEC DE L'ENVOI D'EMAIL ===", 'ERROR');
        http_response_code(500);
        echo json_encode([
            'error' => 'Erreur lors de l\'envoi de l\'email',
            'details' => 'Consultez les logs pour plus d\'informations'
        ]);
    }
    
} catch (Exception $e) {
    logMessage("Exception: " . $e->getMessage(), 'ERROR');
    logMessage("Stack trace: " . $e->getTraceAsString(), 'ERROR');
    
    http_response_code(500);
    echo json_encode([
        'error' => 'Erreur interne du serveur',
        'message' => $e->getMessage()
    ]);
}

logMessage("=== FIN DU TRAITEMENT ===");
?>