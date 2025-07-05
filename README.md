# 📋 Formulaire de Remboursement SAM Athlétisme

> Application web moderne pour la gestion des demandes de remboursement de frais du SAM Athlétisme Mérignacais

[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.1-38B2AC.svg)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-5.4.2-646CFF.svg)](https://vitejs.dev/)

## 🚀 Aperçu

Cette application permet aux membres du SAM Athlétisme Mérignacais de soumettre facilement leurs demandes de remboursement de frais avec :

- ✅ **Interface intuitive** - Formulaire moderne et responsive
- ✅ **Génération PDF automatique** - Fiche de remboursement formatée
- ✅ **Gestion des pièces jointes** - Upload multiple de justificatifs
- ✅ **Calcul automatique** - Remboursement kilométrique (0,321 €/km)
- ✅ **Signature numérique** - Upload d'image de signature
- ✅ **Envoi par email** - Transmission automatique des demandes

## 🛠️ Technologies

- **Frontend** : React 18 + TypeScript + Tailwind CSS
- **Build** : Vite
- **PDF** : jsPDF + html2canvas
- **Icons** : Lucide React
- **Backend** : PHP (serveur séparé)

## 📦 Installation

```bash
# Cloner le projet
git clone [url-du-repo]
cd formulaire-sam-athletisme

# Installer les dépendances
npm install

# Lancer en développement
npm run dev

# Construire pour la production
npm run build
```

## 🔧 Configuration

### Variables d'environnement

Aucune variable d'environnement n'est requise pour le frontend. L'application est configurée pour envoyer les données vers :

```
https://api.scarbonk.fr/form-handler.php
```

### Backend PHP

Le backend est hébergé séparément et gère :
- Réception des données du formulaire
- Envoi d'emails avec pièces jointes
- Génération de logs
- Validation CORS

## 📱 Fonctionnalités

### Formulaire Principal
- **Informations personnelles** : Nom, prénom, rôle, lieu, dates
- **Motivation** : Description détaillée de la demande
- **Dépenses** : Ajout dynamique de lignes de dépenses
- **Justificatifs** : Upload de fichiers par dépense

### Remboursement Kilométrique
- Calcul automatique à 0,321 €/km
- Option véhicule de location
- Intégration au total général

### Pièces Justificatives
- **Documents de transport** : Carte grise, contrats, tickets
- **Informations bancaires** : RIB, relevés
- **Documents supplémentaires** : Autres justificatifs

### Signature Numérique
- Upload d'image de signature
- Aperçu en temps réel
- Intégration dans le PDF généré

## 📄 Génération PDF

Le système génère automatiquement un PDF professionnel contenant :

- Logo SAM Athlétisme
- Informations complètes du demandeur
- Détail des dépenses avec justificatifs
- Calculs automatiques
- Signature numérique
- Zones de signature (demandeur + président)

**Format de fichier** : `fiche_remboursement_[date]_[prenom-nom]_[motif].pdf`

## 🌐 Déploiement

### Architecture Recommandée

```
Frontend (Vercel)     Backend (Serveur PHP)
     ↓                        ↓
sam-athletisme.vercel.app → api.scarbonk.fr
```

### Étapes de Déploiement

1. **Frontend sur Vercel**
   ```bash
   npm run build
   # Déployer le dossier 'dist/' sur Vercel
   ```

2. **Backend sur serveur PHP**
   - Uploader les fichiers backend sur le serveur
   - Configurer les permissions (755 pour dossiers, 644 pour fichiers)
   - Tester la fonction `mail()` PHP

### Configuration CORS

Le backend doit autoriser les domaines :
- `https://sam-athletisme.vercel.app`
- `https://*.vercel.app`
- Votre domaine personnalisé

## 📧 Configuration Email

### Prérequis
- Serveur avec fonction `mail()` PHP activée
- Adresse email `noreply@[votre-domaine]` configurée
- Certificat SSL valide

### Format d'Email
L'email envoyé contient :
- Résumé complet de la demande
- Liste des fichiers joints
- PDF de synthèse en pièce jointe
- Tous les justificatifs uploadés

## 🔒 Sécurité

- **Validation côté client** : Vérification des types de fichiers
- **Validation côté serveur** : Contrôle des uploads
- **CORS configuré** : Domaines autorisés uniquement
- **Logs détaillés** : Traçabilité des soumissions
- **Limite de taille** : 5MB par fichier image

## 📊 Monitoring

### Logs Disponibles
- `backend/logs/form-submissions.log` : Soumissions réussies
- `backend/logs/errors.log` : Erreurs et problèmes

### Métriques
- Nombre de formulaires soumis
- Taux de succès d'envoi
- Taille moyenne des pièces jointes

## 🛠️ Développement

### Scripts Disponibles
```bash
npm run dev      # Serveur de développement
npm run build    # Construction production
npm run preview  # Aperçu de la build
npm run lint     # Vérification du code
```

### Structure du Projet
```
src/
├── App.tsx              # Composant principal
├── main.tsx            # Point d'entrée
├── index.css           # Styles globaux
└── utils/
    └── pdfGenerator.ts # Génération PDF
```

## 🔗 Liens Utiles

- **Site SAM Athlétisme** : [sam-athletisme.fr](https://www.sam-athletisme.fr/)
- **Développeur** : [Hugo Scarbonchi](https://www.hugoscarbonchi.fr/)
- **Documentation Vite** : [vitejs.dev](https://vitejs.dev/)
- **Documentation React** : [reactjs.org](https://reactjs.org/)

## 📝 Support

Pour toute question ou problème :

1. Vérifiez les logs d'erreur
2. Consultez la documentation de déploiement
3. Contactez l'équipe technique du club
4. Référez-vous au guide de dépannage dans `DEPLOYMENT.md`

## 📄 Licence

Ce projet est développé spécifiquement pour le SAM Athlétisme Mérignacais.

---

**Propulsé et développé par [Hugo Scarbonchi](https://www.hugoscarbonchi.fr/)**