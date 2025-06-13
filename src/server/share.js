const fs = require('fs');
const path = require('path');

const sharePath = path.join(__dirname, '../db/share.json');

function loadShares() {
  if (!fs.existsSync(sharePath)) return [];
  return JSON.parse(fs.readFileSync(sharePath, 'utf8'));
}

function saveShares(shares) {
  fs.writeFileSync(sharePath, JSON.stringify(shares, null, 2));
}

function createShare(userId, token) {
  const shares = loadShares();
  shares.push({ userId, token });
  saveShares(shares);
}

function getShare(userId, token) {
  const shares = loadShares();
  return shares.find(s => s.userId === userId && s.token === token);
}

module.exports = { createShare, getShare };