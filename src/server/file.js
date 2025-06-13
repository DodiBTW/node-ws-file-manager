const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const spawn = require('child_process').spawn;
const os = require('os');

const filePath = path.join(__dirname, '../db/files/');

function saveFile(userId, filename, content) {
  const userDir = path.join(__dirname, '../db/files/', userId);
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

function compressUserDirectory(userId) {
  const userDir = path.join(__dirname, '../db/files/', userId);
  if (!fs.existsSync(userDir)) return null;

  const outputZip = path.join(userDir, 'archive.zip');
  const zipexe = path.join(__dirname, '../tools/zip');

  let zip;
  if (os.platform() === 'win32') {
    zip = spawn('powershell.exe', [
      '-Command',
      `Compress-Archive -Path "${userDir}\\*" -DestinationPath "${outputZip}" -Force`
    ]);
  } else {
    zip = spawn('zip', ['-r', outputZip, '.'], { cwd: userDir });
  }

  return new Promise((resolve, reject) => {
    zip.on('close', (code) => {
      if (code === 0) {
        resolve(outputZip);
      } else {
        reject(new Error(`Compression échouée :  ${code}`));
      }
    });
  });
}

module.exports = { saveFile, getFilePath, deleteFile, listFiles, compressUserDirectory };