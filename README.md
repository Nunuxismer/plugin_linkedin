# Extension Chrome LinkedIn Favorites

Cette extension Manifest V3 permet d'ajouter depuis un profil LinkedIn les personnes que vous consultez à des listes de favoris, de gérer ces listes et de lancer des recherches LinkedIn basées sur leur contenu.

## Fonctionnalités principales

- Détection automatique du profil ouvert (`https://www.linkedin.com/in/...`).
- Ajout ou retrait d'un profil dans une liste de favoris depuis le popup.
- Création de nouvelles listes (nom + description + couleur) et ajout automatique du profil courant.
- Page de gestion affichant l'ensemble des listes, avec options de renommage, suppression, filtrage instantané et lancement d'une recherche LinkedIn basée sur les memberId détectés.
- Page de détail présentant tous les profils d'une liste avec accès direct au profil LinkedIn, filtrage textuel et suppression individuelle.

## Structure des fichiers

```
manifest.json          # Déclaration Manifest V3
background.js          # Service worker (initialisation du stockage)
contentScript.js       # Extraction des informations du profil LinkedIn
storage.js             # Fonctions utilitaires de stockage (chrome.storage)
popup.html / popup.js  # Interface principale dans le popup de l'extension
lists.html / lists.js  # Page de gestion des listes
list_detail.html / list_detail.js  # Vue détaillée d'une liste
styles.css             # Styles partagés
```

## Installation pour les tests

1. Téléchargez/cloner ce dépôt puis exécutez `npm install` si nécessaire (aucune dépendance obligatoire pour l'extension elle-même).
2. Dans Chrome, ouvrez `chrome://extensions`, activez le **Mode développeur** puis cliquez sur **Charger l'extension non empaquetée**.
3. Sélectionnez le répertoire `plugin_linkedin/` contenant `manifest.json`.
4. Ouvrez un profil LinkedIn (`https://www.linkedin.com/in/...`) puis cliquez sur l'icône de l'extension pour ajouter ce profil à une liste.

## Remarques

- Les données sont stockées localement via `chrome.storage.local`.
- La génération de la recherche LinkedIn utilise le paramètre `fromMember` alimenté par les `memberId` extraits du HTML des profils ; en l'absence d'identifiants, une recherche booléenne classique sert de repli.
- L'extension ne déclenche aucune action automatique sur LinkedIn en dehors des interactions explicites de l'utilisateur.
