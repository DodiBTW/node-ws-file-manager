// Serveur HTTP simple sans Express
const http = require('http');
const fs = require('fs');
const url = require('url');
const path = require('path');
const { authenticate, getUserIdFromToken } = require('./auth');
const { saveFile, getFilePath, deleteFile, listFiles , compressUserDirectory} = require('./file');
const WebSocket = require('ws');
const { createShare, getShare } = require('./share');
let wsNotify = null;

const clientDir = path.join(__dirname, '../client');


function sendWsNotification(userId, payload) {
  // Envoie une notification au serveur ws qui va la forward au client.
  if (!wsNotify || wsNotify.readyState !== WebSocket.OPEN) {
    wsNotify = new WebSocket('ws://localhost:8081');
    wsNotify.on('open', () => {
      wsNotify.send(JSON.stringify({ __relay: true, userId, payload }));
    });
    wsNotify.on('error', () => {});
  } else {
    wsNotify.send(JSON.stringify({ __relay: true, userId, payload }));
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/main.js'))) {
    // Page d'accueil
    let filePath = path.join(clientDir, req.url === '/' ? 'index.html' : req.url.slice(1));
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end('Not found');
      }
      res.writeHead(200, { 'Content-Type': filePath.endsWith('.js') ? 'application/javascript' : 'text/html' });
      res.end(data);
    });
    return;
  }
  else if (req.method === 'POST' && (req.url === '/login' || req.url === '/login/')) {
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
      if (fs.existsSync(filePath)) {
        res.writeHead(409);
        return res.end('Un fichier avec ce nom existe déjà');
      }
      resp = saveFile(userId, filename, content);
      if (!resp) {
        res.writeHead(500);
        return res.end('Erreur lors de l\'enregistrement de votre fichier');
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      sendWsNotification(userId, { type: 'file-change', action: 'upload', file: filename });
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
      sendWsNotification(userId, { type: 'file-change', action: 'delete', file: filename });
      res.writeHead(204);
      return res.end();
    } else {
      res.writeHead(404);
      return res.end('Fichier non trouvé');
    }
  }
  else if (req.method === 'POST' && req.url === '/compress') {
    // Compression des fichiers de l'utilisateur
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      let token;
      try {
        token = JSON.parse(body).token;
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Bad request' }));
      }
      const userId = getUserIdFromToken(token);
      if (!userId) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Unauthorized' }));
      }
      compressUserDirectory(userId)
        .then(zipPath => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ archive: 'archive.zip' }));
        })
        .catch(err => {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Erreur lors de la compression' }));
          console.error('Erreur lors de la compression : ', err);
        });
    });
  } 

  else if (req.method === 'GET' && req.url.startsWith('/download/')) {
    const token = req.headers.authorization?.split(' ')[1];
    const userId = getUserIdFromToken(token);
    if (!userId) {
      res.writeHead(401);
      return res.end('Unauthorized');
    }
    const filename = decodeURIComponent(req.url.replace('/download/', ''));
    const filePath = path.join(__dirname, '../db/files', userId, filename);
    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      return res.end('Fichier non trouvé');
    }
    const stream = fs.createReadStream(filePath);
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`
    });
    stream.pipe(res);
    stream.on('error', () => {
      res.writeHead(500);
      res.end('Erreur lors du téléchargement');
    });
  }
  else if(req.method == 'POST' && req.url === '/share') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      const { token } = JSON.parse(body);
      const userId = getUserIdFromToken(token);
      if (!userId) {
        res.writeHead(401);
        return res.end('Unauthorized');
      }
      const shareToken = Math.random().toString(36).slice(2, 10);
      createShare(userId, shareToken);
      const shareLink = `http://localhost:3000/share/${userId}/${shareToken}`;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ link: shareLink }));
    });
  }

  else if (req.method === 'GET' && req.url.startsWith('/share/')) {
    const parts = req.url.split('/');
    // /share/:userId/:shareToken
    if (parts.length === 4) {
      const userId = parts[2];
      const shareToken = parts[3];
      if (!getShare(userId, shareToken)) {
        res.writeHead(403);
        return res.end('Lien de partage invalide');
      }
      // Serve share.html with injected variables
      const htmlPath = path.join(clientDir, 'share.html');
      let html = fs.readFileSync(htmlPath, 'utf8');
      html = html.replace('{{USER_ID}}', userId).replace('{{SHARE_TOKEN}}', shareToken);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(html);
    }
    // /share/:userId/:shareToken/files
    if (parts.length === 5 && parts[4] === 'files') {
      const userId = parts[2];
      const shareToken = parts[3];
      if (!getShare(userId, shareToken)) {
        res.writeHead(403);
        return res.end('Lien de partage invalide');
      }
      const files = listFiles(userId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(files));
    }
    // /share/:userId/:shareToken/download/:filename
    if (parts.length === 6 && parts[4] === 'download') {
      const userId = parts[2];
      const shareToken = parts[3];
      const filename = decodeURIComponent(parts[5]);
      if (!getShare(userId, shareToken)) {
        res.writeHead(403);
        return res.end('Lien de partage invalide');
      }
      const filePath = path.join(__dirname, '../db/files', userId, filename);
      if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        return res.end('Fichier non trouvé');
      }
      const stream = fs.createReadStream(filePath);
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`
      });
      stream.pipe(res);
      stream.on('error', () => {
        res.writeHead(500);
        res.end('Erreur lors du téléchargement');
      });
      return;
    }
  }

  else {
  res.writeHead(404);
  res.end('Not found');
}
});

server.listen(3000, () => {
  console.log('Serveur démarré sur http://localhost:3000');
});
