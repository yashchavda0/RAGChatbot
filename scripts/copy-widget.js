const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'packages', 'widget', 'dist', 'widget.js');
const dest = path.join(root, 'frontend', 'public', 'widget.js');

if (!fs.existsSync(src)) {
  console.error(`Widget build output not found: ${src}`);
  process.exit(1);
}

fs.copyFileSync(src, dest);
console.log(`Copied widget bundle to ${dest}`);
