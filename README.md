# Formulaire de Remboursement SAM Athlétisme

## 🚀 Configuration de l'envoi d'emails

Pour que l'envoi d'emails fonctionne, vous avez plusieurs options :

### Option 1: EmailJS (Recommandé pour les tests)

1. Créez un compte sur [EmailJS](https://www.emailjs.com/)
2. Configurez un service email (Gmail, Outlook, etc.)
3. Créez un template d'email
4. Installez EmailJS : `npm install @emailjs/browser`
5. Décommentez la section EmailJS dans `src/App.tsx`
6. Remplacez les clés par vos vraies clés EmailJS

### Option 2: Serveur Backend (Production)

Créez un serveur backend (PHP, Node.js, Python, etc.) qui :
- Reçoit les données du formulaire
- Envoie l'email avec les pièces jointes
- Retourne une réponse de succès/échec

Exemple de serveur PHP simple :

```php
<?php
// form-handler.php
if ($_POST) {
    $to = $_POST['recipient_email'];
    $subject = $_POST['email_subject'];
    $message = $_POST['email_content'];
    
    // Traiter les fichiers et envoyer l'email
    // ... code d'envoi d'email avec pièces jointes
    
    echo json_encode(['status' => 'success']);
} else {
    http_response_code(400);
    echo json_encode(['status' => 'error']);
}
?>
```

### Option 3: Services tiers

- **Formspree** : Service simple pour formulaires
- **Netlify Forms** : Si vous déployez sur Netlify
- **Vercel** : Avec des fonctions serverless

## 📧 Configuration actuelle

Le formulaire est configuré pour envoyer à : `dev@hugoscarbonchi.fr`

Pour changer l'email de destination, modifiez cette ligne dans `src/App.tsx` :
```javascript
console.log('📧 Email simulé envoyé à:', 'dev@hugoscarbonchi.fr');
```

## 🔧 Fonctionnalités actuelles

✅ Génération automatique du PDF  
✅ Téléchargement automatique du PDF  
✅ Interface complète du formulaire  
✅ Validation des champs  
⏳ Envoi d'email (en simulation)  

## 🚀 Déploiement

1. Configurez l'envoi d'emails (voir options ci-dessus)
2. Testez en local
3. Déployez sur votre hébergeur
4. Configurez le domaine et SSL