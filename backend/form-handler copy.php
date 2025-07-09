<?php
header('Content-Type: application/json');
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
$FROM_EMAIL = 'noreply@sam-athletisme.fr'; // Remplacez par votre domaine
$FROM_NAME = 'SAM Athlétisme - Formulaire automatisé';

try {
    // Récupérer les données du formulaire
    $formData = [
        'place' => $_POST['place'] ?? '',
        'date' => $_POST['date'] ?? '',
        'firstName' => $_POST['firstName'] ?? '',
        'lastName' => $_POST['lastName'] ?? '',
        'role' => $_POST['role'] ?? '',
        'subject' => $_POST['subject'] ?? '',
        'motivation' => $_POST['motivation'] ?? '',
        'paymentMethod' => $_POST['paymentMethod'] ?? '',
        'requestDate' => $_POST['requestDate'] ?? '',
        'kilometers' => $_POST['kilometers'] ?? '0',
        'rentalVehicle' => $_POST['rentalVehicle'] ?? 'false',
        'totalAmount' => $_POST['totalAmount'] ?? '0',
        'kilometricReimbursement' => $_POST['kilometricReimbursement'] ?? '0'
    ];

    // Décoder les dépenses
    $expenses = json_decode($_POST['expenses'] ?? '[]', true);

    // Calculer le total général
    $grandTotal = floatval($formData['totalAmount']) + floatval($formData['kilometricReimbursement']);

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
    
    // Ajouter le PDF de synthèse
    if (isset($_FILES['summary_pdf'])) {
        $attachments[] = [
            'name' => $pdfFileName,
            'content' => file_get_contents($_FILES['summary_pdf']['tmp_name']),
            'type' => 'application/pdf'
        ];
    }

    // Ajouter les justificatifs des dépenses
    foreach ($expenses as $expenseIndex => $expense) {
        for ($fileIndex = 0; $fileIndex < 10; $fileIndex++) {
            $fileKey = "expense_{$expenseIndex}_{$fileIndex}";
            if (isset($_FILES[$fileKey])) {
                $file = $_FILES[$fileKey];
                $attachments[] = [
                    'name' => "justificatif_depense_" . ($expenseIndex + 1) . "_" . $file['name'],
                    'content' => file_get_contents($file['tmp_name']),
                    'type' => $file['type']
                ];
            }
        }
    }

    // Ajouter les autres pièces jointes
    $categories = ['transport', 'banking', 'other'];
    foreach ($categories as $category) {
        for ($groupIndex = 0; $groupIndex < 5; $groupIndex++) {
            for ($fileIndex = 0; $fileIndex < 10; $fileIndex++) {
                $fileKey = "{$category}_{$groupIndex}_{$fileIndex}";
                if (isset($_FILES[$fileKey])) {
                    $file = $_FILES[$fileKey];
                    $attachments[] = [
                        'name' => "{$category}_" . $file['name'],
                        'content' => file_get_contents($file['tmp_name']),
                        'type' => $file['type']
                    ];
                }
            }
        }
    }

    // Ajouter la signature si elle existe
    if (isset($_FILES['signatureFile'])) {
        $file = $_FILES['signatureFile'];
        $attachments[] = [
            'name' => "signature_" . $file['name'],
            'content' => file_get_contents($file['tmp_name']),
            'type' => $file['type']
        ];
    }

    // Envoyer l'email
    $emailSent = sendEmailWithAttachments(
        $ADMIN_EMAIL,
        $emailSubject,
        $emailContent,
        $FROM_EMAIL,
        $FROM_NAME,
        $attachments
    );

    if ($emailSent) {
        // Log de succès (optionnel)
        error_log("Formulaire de remboursement envoyé avec succès pour {$formData['firstName']} {$formData['lastName']}");
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Formulaire envoyé avec succès',
            'pdf_filename' => $pdfFileName,
            'total_amount' => $grandTotal
        ]);
    } else {
        throw new Exception('Échec de l\'envoi de l\'email');
    }

} catch (Exception $e) {
    error_log("Erreur formulaire de remboursement: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Erreur lors de l\'envoi du formulaire: ' . $e->getMessage()
    ]);
}

/**
 * Créer le contenu HTML de l'email
 */
function createEmailContent($formData, $expenses, $grandTotal) {
    $expensesList = '';
    foreach ($expenses as $expense) {
        if (!empty($expense['nature']) && !empty($expense['amount'])) {
            $expensesList .= "<li>{$expense['nature']}: {$expense['amount']} €</li>";
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
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: linear-gradient(135deg, #2563eb, #dc2626); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .content { background: #f8fafc; padding: 20px; border-radius: 8px; }
            .total { background: #1e40af; color: white; padding: 15px; border-radius: 8px; text-align: center; font-size: 18px; font-weight: bold; }
            ul { margin: 10px 0; padding-left: 20px; }
            .info-section { margin: 15px 0; }
        </style>
    </head>
    <body>
        <div class='header'>
            <h2>🏃‍♂️ SAM Athlétisme Mérignacais</h2>
            <p>Nouvelle demande de remboursement de frais</p>
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
                    {$formData['motivation']}
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
            
            <p style='margin-top: 20px;'>Vous trouverez le formulaire complété en pièce jointe (PDF), ainsi que les documents justificatifs (factures, RIB, etc.).</p>
            
            <p>Bonne réception,</p>
            <p><em>Formulaire automatisé SAM Athlétisme</em></p>
        </div>
    </body>
    </html>";
}

/**
 * Envoyer un email avec pièces jointes
 */
function sendEmailWithAttachments($to, $subject, $htmlContent, $fromEmail, $fromName, $attachments = []) {
    $boundary = md5(time());
    
    // Headers
    $headers = [
        "From: {$fromName} <{$fromEmail}>",
        "Reply-To: {$fromEmail}",
        "MIME-Version: 1.0",
        "Content-Type: multipart/mixed; boundary=\"{$boundary}\""
    ];
    
    // Corps du message
    $message = "--{$boundary}\r\n";
    $message .= "Content-Type: text/html; charset=UTF-8\r\n";
    $message .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
    $message .= $htmlContent . "\r\n\r\n";
    
    // Ajouter les pièces jointes
    foreach ($attachments as $attachment) {
        $message .= "--{$boundary}\r\n";
        $message .= "Content-Type: {$attachment['type']}; name=\"{$attachment['name']}\"\r\n";
        $message .= "Content-Disposition: attachment; filename=\"{$attachment['name']}\"\r\n";
        $message .= "Content-Transfer-Encoding: base64\r\n\r\n";
        $message .= chunk_split(base64_encode($attachment['content'])) . "\r\n";
    }
    
    $message .= "--{$boundary}--";
    
    // Envoyer l'email
    return mail($to, $subject, $message, implode("\r\n", $headers));
}
?>