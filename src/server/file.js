const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const filePath = path.join(__dirname, '../db/files/');

function saveFile(userId, filename, content) {
  const userDir = path.join(__dirname, '../uploads', userId);
  const filePath = path.join(userDir, filename);

  // Créer le répertoire de l'utilisateur s'il n'existe pas
  fs.mkdirSync(userDir, { recursive: true });

  // Enregistrer le fichier
  fs.writeFileSync(filePath, content);
  
  return filePath;
}
function getFilePath(userId, filename) {
  const userDir = path.join(__dirname, '../db/files/', userId);
  return path.join(userDir, filename);
}
function deleteFile(userId, filename) {
  const filePath = getFilePath(userId, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}
function listFiles(userId) {
  const userDir = path.join(__dirname, '../db/files/', userId);
  if (!fs.existsSync(userDir)) return [];
  return fs.readdirSync(userDir).map(file => ({
    name: file,
  }));
}