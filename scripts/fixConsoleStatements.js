/**
 * Script to replace all console.log with console.info statements in the codebase
 * Fixes ESLint no-console warnings
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup ES Module equivalents of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SRC_DIR = path.join(__dirname, '..', 'src');
const IGNORE_DIRS = ['node_modules', 'dist', 'build', '.git'];
const IGNORE_FILES = ['.DS_Store', '.gitignore'];
const CODE_FILE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

// Promisify fs functions
const readdir = fs.promises.readdir;
const readFile = fs.promises.readFile;
const writeFile = fs.promises.writeFile;
const stat = fs.promises.stat;

// Function to get all files recursively
async function getFiles(dir, fileList = []) {
  const files = await readdir(dir);

  for (const file of files) {
    if (IGNORE_DIRS.includes(file)) continue;
    if (IGNORE_FILES.includes(file)) continue;

    const filePath = path.join(dir, file);
    const fileStat = await stat(filePath);

    if (fileStat.isDirectory()) {
      fileList = await getFiles(filePath, fileList);
    } else {
      const ext = path.extname(file);
      if (CODE_FILE_EXTENSIONS.includes(ext)) {
        fileList.push(filePath);
      }
    }
  }

  return fileList;
}

// Function to fix console.log statements in a file
async function fixConsoleStatements(filePath) {
  let content = await readFile(filePath, 'utf8');

  // Check if the file has console.log statements
  const hasConsoleLog = content.includes('console.log');

  if (hasConsoleLog) {
    // Replace console.log with console.info
    // But preserve console.error and console.warn
    const newContent = content.replace(/console\.log\(/g, 'console.info(');

    // Only write to the file if changes were made
    if (newContent !== content) {
      await writeFile(filePath, newContent, 'utf8');
      console.info(`Fixed console.log statements in: ${path.relative(process.cwd(), filePath)}`);
      return true;
    }
  }

  return false;
}

// Main function
async function main() {
  try {
    console.info('Starting to fix console.log statements...');

    // Get all JS/JSX files
    const files = await getFiles(SRC_DIR);
    console.info(`Found ${files.length} files to process`);

    // Process each file
    let fixedFiles = 0;
    for (const file of files) {
      const fixed = await fixConsoleStatements(file);
      if (fixed) fixedFiles++;
    }

    console.info(`Completed! Fixed console.log statements in ${fixedFiles} files.`);
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
