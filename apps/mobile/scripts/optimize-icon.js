/**
 * One-off script to resize and compress app icon for lower memory pressure.
 * Run from apps/mobile: node scripts/optimize-icon.js
 * Requires: npm install --save-dev sharp
 */
const path = require('path');
const fs = require('fs');

const iconPath = path.join(__dirname, '../assets/icon.png');
const backupPath = path.join(__dirname, '../assets/icon.png.backup');

async function main() {
  const sharp = require('sharp');
  const stat = fs.statSync(iconPath);
  console.log('Original size:', (stat.size / 1024).toFixed(1), 'KB');

  await sharp(iconPath)
    .resize(1024, 1024)
    .png({ compressionLevel: 9 })
    .toFile(iconPath + '.tmp');

  const newStat = fs.statSync(iconPath + '.tmp');
  console.log('Compressed size:', (newStat.size / 1024).toFixed(1), 'KB');

  fs.renameSync(iconPath, backupPath);
  fs.renameSync(iconPath + '.tmp', iconPath);
  console.log('Replaced icon.png. Backup saved as icon.png.backup');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
