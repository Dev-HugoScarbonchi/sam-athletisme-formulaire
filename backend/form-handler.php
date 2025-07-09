<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Gérer les requêtes OPTIONS (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Vérifier que c'est une requête POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Méthode non autorisée']);
    exit();
}

// Configuration email
$ADMIN_EMAIL = 'dev@hugoscarbonchi.fr';
$FROM_EMAIL = 'noreply@scarbonk.fr'; // Changé pour utiliser votre domaine
$FROM_NAME = 'SAM Athlétisme - Formulaire automatisé';

// Configuration des logs
$LOG_DIR = __DIR__ . '/logs';
if (!is_dir($LOG_DIR)) {
    mkdir($LOG_DIR, 0755, true);
}

// Fonction de logging améliorée
function logMessage($message, $level = 'INFO') {
    global $LOG_DIR;
    $timestamp = date('Y-m-d H:i:s');
    $logFile = $LOG_DIR . '/form-handler.log';
    $logEntry = "[$timestamp] [$level] $message" . PHP_EOL;
    
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
    
    // Log séparé pour les erreurs
    if ($level === 'ERROR') {
        $errorFile = $LOG_DIR . '/errors.log';
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

try {
    logMessage("=== DÉBUT DU TRAITEMENT D'UNE NOUVELLE DEMANDE ===");
    logMessage("IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'Inconnue'));
    logMessage("User-Agent: " . ($_SERVER['HTTP_USER_AGENT'] ?? 'Inconnu'));
    
    // Récupérer les données du formulaire avec sanitisation
    $formData = [
        'place' => sanitizeInput($_POST['place'] ?? ''),
        'date' => sanitizeInput($_POST['date'] ?? ''),
        'firstName' => sanitizeInput($_POST['firstName'] ?? ''),
        'lastName' => sanitizeInput($_POST['lastName'] ?? ''),
        'role' => sanitizeInput($_POST['role'] ?? ''),
        'subject' => sanitizeInput($_POST['subject'] ?? ''),
        'motivation' => sanitizeInput($_POST['motivation'] ?? ''),
        'paymentMethod' => sanitizeInput($_POST['paymentMethod'] ?? ''),
        'requestDate' => sanitizeInput($_POST['requestDate'] ?? ''),
        'kilometers' => sanitizeInput($_POST['kilometers'] ?? '0'),
        'rentalVehicle' => sanitizeInput($_POST['rentalVehicle'] ?? 'false'),
        'totalAmount' => sanitizeInput($_POST['totalAmount'] ?? '0'),
        'kilometricReimbursement' => sanitizeInput($_POST['kilometricReimbursement'] ?? '0')
    ];

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

    logMessage("Demande de: " . $formData['firstName'] . " " . $formData['lastName']);
    logMessage("Objet: " . $formData['subject']);

    // Décoder les dépenses
    $expenses = json_decode($_POST['expenses'] ?? '[]', true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        logMessage("Erreur de décodage JSON des dépenses: " . json_last_error_msg(), 'ERROR');
        $expenses = [];
    }
    
    logMessage("Nombre de dépenses: " . count($expenses));

    // Calculer le total général
    $grandTotal = floatval($formData['totalAmount']) + floatval($formData['kilometricReimbursement']);
    logMessage("Montant total: " . $grandTotal . " €");

    // Formater le nom du fichier PDF
    $formatDate = str_replace('-', '', $formData['requestDate']);
    $formatName = strtolower(str_replace(' ', '-', $formData['firstName'] . '-' . $formData['lastName']));
    $formatMotif = strtolower(preg_replace('/[^a-z0-9]/', '-', $formData['subject']));
    $formatMotif = preg_replace('/-+/', '-', trim($formatMotif, '-'));
    $pdfFileName = "fiche_remboursement_{$formatDate}_{$formatName}_{$formatMotif}.pdf";

    // Créer le sujet de l'email
    $emailSubject = "FORMULAIRE DE REMBOURSEMENT DE FRAIS - {$formData['lastName']} {$formData['firstName']} - " . 
                   date('d/m/Y', strtotime($formData['requestDate'])) . " - Motif : {$formData['subject']}";

    // Créer le contenu HTML de l'email
    $emailContent = createEmailContent($formData, $expenses, $grandTotal);

    // Préparer les pièces jointes
    $attachments = [];
    $attachmentCount = 0;
    
    // Ajouter le PDF de synthèse
    if (isset($_FILES['summary_pdf']) && $_FILES['summary_pdf']['error'] === UPLOAD_ERR_OK) {
        $attachments[] = [
            'name' => $pdfFileName,
            'content' => file_get_contents($_FILES['summary_pdf']['tmp_name']),
            'type' => 'application/pdf'
        ];
        $attachmentCount++;
        logMessage("PDF de synthèse ajouté: " . $pdfFileName);
    }

    // Ajouter les justificatifs des dépenses
    foreach ($expenses as $expenseIndex => $expense) {
        for ($fileIndex = 0; $fileIndex < 10; $fileIndex++) {
            $fileKey = "expense_{$expenseIndex}_{$fileIndex}";
            if (isset($_FILES[$fileKey]) && $_FILES[$fileKey]['error'] === UPLOAD_ERR_OK) {
                $file = $_FILES[$fileKey];
                $attachments[] = [
                    'name' => "justificatif_depense_" . ($expenseIndex + 1) . "_" . $file['name'],
                    'content' => file_get_contents($file['tmp_name']),
                    'type' => $file['type']
                ];
                $attachmentCount++;
                logMessage("Justificatif dépense ajouté: " . $file['name']);
            }
        }
    }

    // Ajouter les autres pièces jointes
    $categories = ['transport', 'banking', 'other'];
    foreach ($categories as $category) {
        for ($groupIndex = 0; $groupIndex < 5; $groupIndex++) {
            for ($fileIndex = 0; $fileIndex < 10; $fileIndex++) {
                $fileKey = "{$category}_{$groupIndex}_{$fileIndex}";
                if (isset($_FILES[$fileKey]) && $_FILES[$fileKey]['error'] === UPLOAD_ERR_OK) {
                    $file = $_FILES[$fileKey];
                    $attachments[] = [
                        'name' => "{$category}_" . $file['name'],
                        'content' => file_get_contents($file['tmp_name']),
                        'type' => $file['type']
                    ];
                    $attachmentCount++;
                    logMessage("Pièce jointe {$category} ajoutée: " . $file['name']);
                }
            }
        }
    }

    // Ajouter la signature si elle existe
    if (isset($_FILES['signatureFile']) && $_FILES['signatureFile']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['signatureFile'];
        $attachments[] = [
            'name' => "signature_" . $file['name'],
            'content' => file_get_contents($file['tmp_name']),
            'type' => $file['type']
        ];
        $attachmentCount++;
        logMessage("Signature ajoutée: " . $file['name']);
    }

    logMessage("Total pièces jointes: " . $attachmentCount);

    // Envoyer l'email
    logMessage("Tentative d'envoi d'email vers: " . $ADMIN_EMAIL);
    $emailSent = sendEmailWithAttachments(
        $ADMIN_EMAIL,
        $emailSubject,
        $emailContent,
        $FROM_EMAIL,
        $FROM_NAME,
        $attachments
    );

    if ($emailSent) {
        logMessage("=== EMAIL ENVOYÉ AVEC SUCCÈS ===");
        
        // Log de la soumission réussie
        $submissionLog = [
            'timestamp' => date('Y-m-d H:i:s'),
            'name' => $formData['firstName'] . ' ' . $formData['lastName'],
            'subject' => $formData['subject'],
            'total_amount' => $grandTotal,
            'attachments_count' => $attachmentCount,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'Inconnue'
        ];
        
        $submissionLogFile = $LOG_DIR . '/submissions.log';
        file_put_contents($submissionLogFile, json_encode($submissionLog) . PHP_EOL, FILE_APPEND | LOCK_EX);
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Formulaire envoyé avec succès',
            'pdf_filename' => $pdfFileName,
            'total_amount' => $grandTotal,
            'attachments_processed' => $attachmentCount
        ]);
    } else {
        throw new Exception('Échec de l\'envoi de l\'email - Vérifiez les logs pour plus de détails');
    }

} catch (Exception $e) {
    logMessage("EXCEPTION: " . $e->getMessage(), 'ERROR');
    logMessage("Stack trace: " . $e->getTraceAsString(), 'ERROR');
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Erreur lors de l\'envoi du formulaire: ' . $e->getMessage()
    ]);
}

logMessage("=== FIN DU TRAITEMENT ===");

/**
 * Créer le contenu HTML de l'email
 */
function createEmailContent($formData, $expenses, $grandTotal) {
    $expensesList = '';
    foreach ($expenses as $expense) {
        if (!empty($expense['nature']) && !empty($expense['amount'])) {
            $expensesList .= "<li>" . htmlspecialchars($expense['nature']) . ": " . htmlspecialchars($expense['amount']) . " €</li>";
        }
    }

    $kilometricInfo = '';
    if (floatval($formData['kilometers']) > 0) {
        $kilometricInfo = "
        <p><strong>Remboursement kilométrique :</strong></p>
        <ul>
            <li>Kilomètres parcourus : {$formData['kilometers']} km</li>
            <li>Montant : {$formData['kilometricReimbursement']} €</li>
            <li>Véhicule de location : " . ($formData['rentalVehicle'] === 'true' ? 'Oui' : 'Non') . "</li>
        </ul>";
    }

    return "
    <html>
    <head>
        <meta charset='UTF-8'>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #2563eb, #dc2626); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .content { background: #f8fafc; padding: 20px; border-radius: 8px; }
            .total { background: #1e40af; color: white; padding: 15px; border-radius: 8px; text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0; }
            ul { margin: 10px 0; padding-left: 20px; }
            .info-section { margin: 15px 0; }
            .footer { margin-top: 30px; padding: 15px; background: #e9ecef; border-radius: 5px; font-size: 0.9em; color: #6c757d; }
        </style>
    </head>
    <body>
        <div class='header'>
            <h2>🏃‍♂️ SAM Athlétisme Mérignacais</h2>
            <p>Nouvelle demande de remboursement de frais</p>
            <p>Reçue le " . date('d/m/Y à H:i') . "</p>
        </div>
        
        <div class='content'>
            <p>Bonjour,</p>
            
            <p>Une nouvelle demande de remboursement de frais a été soumise par <strong>{$formData['firstName']} {$formData['lastName']}</strong>.</p>
            
            <div class='info-section'>
                <p><strong>Informations de la demande :</strong></p>
                <ul>
                    <li><strong>Date de la demande :</strong> " . date('d/m/Y', strtotime($formData['requestDate'])) . "</li>
                    <li><strong>Motif :</strong> {$formData['subject']}</li>
                    <li><strong>Rôle/Fonction :</strong> {$formData['role']}</li>
                    <li><strong>Lieu :</strong> {$formData['place']}</li>
                    <li><strong>Date de l'événement :</strong> " . date('d/m/Y', strtotime($formData['date'])) . "</li>
                    <li><strong>Mode de paiement souhaité :</strong> {$formData['paymentMethod']}</li>
                </ul>
            </div>
            
            <div class='info-section'>
                <p><strong>Motivation :</strong></p>
                <p style='background: white; padding: 10px; border-left: 4px solid #2563eb; margin: 10px 0;'>
                    " . nl2br(htmlspecialchars($formData['motivation'])) . "
                </p>
            </div>
            
            <div class='info-section'>
                <p><strong>Détail des dépenses :</strong></p>
                <ul>{$expensesList}</ul>
                <p><strong>Total des dépenses :</strong> {$formData['totalAmount']} €</p>
            </div>
            
            {$kilometricInfo}
            
            <div class='total'>
                💰 MONTANT TOTAL DE LA DEMANDE : " . number_format($grandTotal, 2, ',', ' ') . " €
            </div>
            
            <div class='footer'>
                <p><strong>📎 Pièces jointes :</strong> Fiche de remboursement PDF + justificatifs uploadés</p>
                <p><strong>⚠️ Important :</strong> Cette demande nécessite validation et signature du président.</p>
                <p><em>Email généré automatiquement par le système de gestion SAM Athlétisme</em></p>
            </div>
        </div>
    </body>
    </html>";
}

/**
 * Envoyer un email avec pièces jointes - Version améliorée
 */
function sendEmailWithAttachments($to, $subject, $htmlContent, $fromEmail, $fromName, $attachments = []) {
    logMessage("Début de l'envoi d'email vers: $to");
    
    // Validation des emails
    if (!isValidEmail($to)) {
        logMessage("Email destinataire invalide: $to", 'ERROR');
        return false;
    }
    
    if (!isValidEmail($fromEmail)) {
        logMessage("Email expéditeur invalide: $fromEmail", 'ERROR');
        return false;
    }
    
    $boundary = md5(uniqid(time()));
    
    // Headers améliorés
    $headers = [
        "From: {$fromName} <{$fromEmail}>",
        "Reply-To: {$fromEmail}",
        "MIME-Version: 1.0",
        "Content-Type: multipart/mixed; boundary=\"{$boundary}\"",
        "X-Mailer: PHP/" . phpversion(),
        "X-Priority: 3",
        "Date: " . date('r')
    ];
    
    // Corps du message
    $message = "--{$boundary}\r\n";
    $message .= "Content-Type: text/html; charset=UTF-8\r\n";
    $message .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $message .= $htmlContent . "\r\n\r\n";
    
    // Ajouter les pièces jointes
    foreach ($attachments as $attachment) {
        if (!isset($attachment['name']) || !isset($attachment['content']) || !isset($attachment['type'])) {
            logMessage("Pièce jointe invalide ignorée", 'WARNING');
            continue;
        }
        
        $filename = $attachment['name'];
        $content = $attachment['content'];
        $mimeType = $attachment['type'];
        
        logMessage("Ajout de la pièce jointe: $filename ($mimeType)");
        
        $message .= "--{$boundary}\r\n";
        $message .= "Content-Type: {$mimeType}; name=\"{$filename}\"\r\n";
        $message .= "Content-Transfer-Encoding: base64\r\n";
        $message .= "Content-Disposition: attachment; filename=\"{$filename}\"\r\n\r\n";
        $message .= chunk_split(base64_encode($content)) . "\r\n";
    }
    
    $message .= "--{$boundary}--\r\n";
    
    // Envoyer l'email
    $headerString = implode("\r\n", $headers);
    
    logMessage("Tentative d'envoi avec " . count($attachments) . " pièce(s) jointe(s)");
    
    $result = mail($to, $subject, $message, $headerString);
    
    if ($result) {
        logMessage("Email envoyé avec succès vers: $to");
        return true;
    } else {
        $error = error_get_last();
        logMessage("Échec de l'envoi d'email vers: $to. Erreur: " . ($error['message'] ?? 'Inconnue'), 'ERROR');
        return false;
    }
}
?>