// Serveur HTTP simple sans Express
const http = require('http');
const fs = require('fs');
const url = require('url');
const { authenticate, getUserIdFromToken } = require('./auth');
const { saveFile, getFilePath, deleteFile, listFiles } = require('./file');

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && (req.url === '/login' || req.url === '/login/')) {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      const { username, password } = JSON.parse(body);
      const token = authenticate(username, password);
      if (token) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ token }));
      } else {
        res.writeHead(401);
        res.end('Unauthorized');
      }
    });
  } 
  else if (req.method === 'POST' && req.url === '/upload') {
    // Envoi de fichier
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      const { token, filename, content } = JSON.parse(body);
      const userId = getUserIdFromToken(token);
      if (!userId) {
        res.writeHead(401);
        return res.end('Unauthorized');
      }
      // Utilisateur authentifié, on ajoute le fichier sous son userId
      const filePath = `../db/files/${userId}/${filename}`;
      if (fs.exists(filePath)) {
        res.writeHead(409);
        return res.end('Un fichier avec ce nom existe déjà');
      }
      resp = saveFile(userId, filename, content);
      if (!resp) {
        res.writeHead(500);
        return res.end('Erreur lors de l\'enregistrement de votre fichier');
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ filePath }));
    }
    );
  }
  else if (req.method === 'GET' && (req.url == '/files/' || req.url == '/files')) {
    // Liste des fichiers
    const token = req.headers.authorization?.split(' ')[1];
    const userId = getUserIdFromToken(token);
    if (!userId) {
      res.writeHead(401);
      return res.end('Unauthorized');
    }
    const files = listFiles(userId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(files));
  } 
  else if (req.method === 'DELETE' && req.url.startsWith('/files/')) {
    // Suppression de fichier
    const token = req.headers.authorization?.split(' ')[1];
    const userId = getUserIdFromToken(token);
    if (!userId) {
      res.writeHead(401);
      return res.end('Unauthorized');
    }
    const filename = req.url.split('/').pop();
    const success = deleteFile(userId, filename);
    if (success) {
      res.writeHead(204);
      return res.end();
    } else {
      res.writeHead(404);
      return res.end('Fichier non trouvé');
    }
  }
  else {
    // Page d'accueil
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bienvenue dans le gestionnaire de fichiers !');
  }
});

server.listen(3000, () => {
  console.log('Serveur démarré sur http://localhost:3000');
});
