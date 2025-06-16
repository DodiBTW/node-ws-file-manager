# Projet Node.js - Gestionnaire de Fichiers

## Fonctionnalités
- Authentification simple via fichier
- Upload/Download de fichiers avec `fs`
- WebSocket pour notifications avec `ws`
- spawn/exec pour traitement système
- Pas de frameworks externes sauf `ws`

## Démarrage
```bash
npm install
npm start        # Lancer l'API HTTP
npm run ws       # Lancer le serveur WebSocket
npm run test     # Lancer les tests des serveurs
```

---

## Explication 

Le projet est organisé pour être le plus clair possible : chaque partie du code a son propre fichier (serveur HTTP, WebSocket, logique fichiers, etc.), ce qui rend la maintenance et la compréhension plus faciles.
Le code est commenté, et les noms de fonctions/variables sont explicites pour qu’on sache direct à quoi ça sert.

Les tests automatiques (avec la lib interne de Node) vérifient les fonctionnalités principales : connexion, upload, suppression, compression…

## Comment se connecter
Se diriger au lien suivant : http://localhost:3000