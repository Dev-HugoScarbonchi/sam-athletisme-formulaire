# 🚀 Guide de Déploiement - Formulaire SAM Athlétisme

## 📋 Prérequis

- **Hébergement web** avec support PHP 7.4+ et fonction `mail()`
- **Nom de domaine** configuré
- **Accès FTP/SFTP** ou panneau d'administration
- **Certificat SSL** (recommandé)

## 🔧 Étapes de Déploiement

### Configuration Vercel + Serveur PHP séparé

Cette configuration est idéale car :
- ✅ **Frontend sur Vercel** : Déploiement automatique, CDN global, HTTPS gratuit
- ✅ **Backend PHP sur votre serveur** : Contrôle total, pas de limite d'envoi d'emails
- ✅ **Séparation des responsabilités** : Frontend statique + API backend

### 1. Préparer les fichiers

#### Frontend (React)
```bash
# Construire l'application
npm run build

# Les fichiers seront dans le dossier 'dist/'
```

#### Backend (PHP) - À déployer sur scarbonk.fr
- Copiez tous les fichiers du dossier `backend/`
- Uploadez-les dans `/sam/backend/` sur scarbonk.fr
- Renommez `config.php` en `config.local.php`

### 2. Configuration du serveur PHP (scarbonk.fr)

#### Structure des dossiers sur scarbonk.fr :
```
scarbonk.fr/
├── public_html/                 # Racine web
│   └── sam/                    # Dossier SAM
│       └── backend/            # Scripts PHP
│           ├── form-handler.php
│           ├── config.local.php
│           ├── .htaccess
│           └── logs/           # Dossier de logs (chmod 755)
```

### 3. Configuration Vercel (Frontend)

#### Déployer sur Vercel :
1. Connectez votre repo GitHub à Vercel
2. Vercel détectera automatiquement que c'est un projet Vite
3. Le build se fera automatiquement
4. Vous obtiendrez une URL comme `https://sam-athletisme.vercel.app`

### 4. Configuration PHP (Backend)

#### Dans `config.local.php` :
```php
<?php
// Email de réception
define('ADMIN_EMAIL', 'secretariat@sam-athletisme.fr');

// Email d'envoi (IMPORTANT: doit être sur votre domaine)
define('FROM_EMAIL', 'noreply@scarbonk.fr');

// Domaines autorisés (incluant Vercel)
define('ALLOWED_ORIGINS', [
    'https://scarbonk.fr',
    'https://sam-athletisme.vercel.app', // Votre URL Vercel
    'https://*.vercel.app' // Tous vos déploiements Vercel
]);
// Domaines autorisés
define('ALLOWED_ORIGINS', [
    'https://votre-domaine.fr',
    'https://www.votre-domaine.fr'
]);
?>
```

### 5. Configuration DNS/Email

#### Créer un enregistrement email :
- Créez l'adresse `noreply@scarbonk.fr` dans votre panneau d'hébergement
- Ou configurez un serveur SMTP externe

#### Test de la fonction mail() :
```php
<?php
// test-mail.php - À supprimer après test
if (mail('votre-email@test.fr', 'Test', 'Test de la fonction mail()')) {
    echo 'Mail envoyé avec succès';
} else {
    echo 'Erreur d\'envoi';
}
?>
```

### 6. Permissions et Sécurité (serveur PHP)

#### Permissions des dossiers :
```bash
chmod 755 sam/backend/
chmod 755 sam/backend/logs/
chmod 644 sam/backend/*.php
chmod 644 sam/backend/.htaccess
```

#### Sécurité :
- ✅ Certificat SSL activé
- ✅ Fichiers de logs protégés
- ✅ CORS configuré
- ✅ Validation des uploads

## 🧪 Tests de Validation

### 1. Test du Backend
```bash
curl -X POST https://scarbonk.fr/sam/backend/form-handler.php
# Doit retourner une erreur 405 (normal)
```

### 2. Test du Frontend
- Ouvrez votre URL Vercel (ex: `https://sam-athletisme.vercel.app`)
- Remplissez le formulaire de test
- Vérifiez la réception de l'email

### 3. Test des Logs
- Vérifiez `sam/backend/logs/form-submissions.log`
- Vérifiez `sam/backend/logs/errors.log`

## 🔍 Dépannage Courant

### ❌ Email non reçu
**Solutions :**
1. Vérifiez les logs PHP : `tail -f backend/logs/errors.log`
2. Testez la fonction mail() avec le script de test
3. Configurez un serveur SMTP si nécessaire
4. Vérifiez les spams/indésirables

### ❌ Erreur CORS
**Solutions :**
1. Vérifiez que votre domaine est dans `ALLOWED_ORIGINS`
2. Assurez-vous que le `.htaccess` est bien uploadé
3. Vérifiez que mod_rewrite est activé

### ❌ Fichiers trop volumineux
**Solutions :**
1. Augmentez `upload_max_filesize` dans php.ini
2. Augmentez `post_max_size` dans php.ini
3. Contactez votre hébergeur pour les limites

### ❌ Erreur 500
**Solutions :**
1. Vérifiez les logs d'erreur du serveur
2. Vérifiez la syntaxe PHP
3. Vérifiez les permissions des fichiers

## 📊 Monitoring

### Logs à surveiller :
- `backend/logs/form-submissions.log` : Soumissions réussies
- `backend/logs/errors.log` : Erreurs et problèmes
- Logs du serveur web (Apache/Nginx)

### Métriques importantes :
- Nombre de formulaires soumis
- Taux d'erreur d'envoi
- Taille moyenne des pièces jointes

## 🔄 Maintenance

### Nettoyage périodique :
```bash
# Nettoyer les logs anciens (> 30 jours)
find backend/logs/ -name "*.log" -mtime +30 -delete

# Vérifier l'espace disque
du -sh backend/logs/
```

### Mises à jour :
1. Sauvegardez les fichiers de configuration
2. Téléchargez les nouvelles versions
3. Restaurez votre configuration
4. Testez le fonctionnement

## 📞 Support

En cas de problème :
1. Consultez les logs d'erreur
2. Vérifiez la configuration
3. Contactez votre hébergeur si nécessaire
4. Documentez le problème pour le support technique

---

**✅ Checklist de déploiement :**
- [ ] Fichiers uploadés
- [ ] Configuration PHP modifiée
- [ ] Permissions définies
- [ ] SSL activé
- [ ] Email de test envoyé
- [ ] Logs vérifiés
- [ ] URL mise à jour dans le frontend
- [ ] Application reconstruite et redéployée