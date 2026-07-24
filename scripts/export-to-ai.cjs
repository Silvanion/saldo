const fs = require('fs');
const path = require('path');

const DIRECTORIES_TO_SCAN = ['src', 'public'];
const FILES_TO_INCLUDE = ['package.json', 'firestore.rules', 'firebase-blueprint.json', 'vite.config.ts', 'server.ts', 'tsconfig.json', 'README.md', 'Design.md'];
const EXTENSIONS_TO_INCLUDE = ['.ts', '.tsx', '.json', '.md', '.css', '.html', '.rules'];

const OUTPUT_FILE = 'saldo-ai-studio-dump.md';

function getAllFiles(dirPath, arrayOfFiles) {
  files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });

  return arrayOfFiles;
}

function generateDump() {
  let allFiles = [...FILES_TO_INCLUDE];
  
  DIRECTORIES_TO_SCAN.forEach(dir => {
    if (fs.existsSync(dir)) {
      allFiles = allFiles.concat(getAllFiles(dir));
    }
  });

  // Filter out by extension and ignore node_modules/dist
  allFiles = allFiles.filter(f => {
    const ext = path.extname(f);
    return EXTENSIONS_TO_INCLUDE.includes(ext);
  });

  let output = "# Saldo App - Codebase Dump for Google AI Studio\n\n";

  allFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      output += `\n\n## File: ${file}\n`;
      const ext = path.extname(file).replace('.', '');
      output += `\`\`\`${ext}\n`;
      output += content;
      output += `\n\`\`\`\n`;
    } catch (e) {
      console.error("Could not read file:", file);
    }
  });

  fs.writeFileSync(OUTPUT_FILE, output);
  console.log(`Generated export at: ${path.resolve(OUTPUT_FILE)}`);
  console.log(`File size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2)} KB`);
}

generateDump();
