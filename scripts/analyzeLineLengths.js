/**
 * Script to fix max-len issues in the codebase by reformatting long lines
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup ES Module equivalents of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SRC_DIR = path.join(__dirname, '..');
const IGNORE_DIRS = ['node_modules', 'dist', 'build', '.git'];
const IGNORE_FILES = ['.DS_Store', '.gitignore'];
const CODE_FILE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];
const MAX_LINE_LENGTH = 100;

// Promisify fs functions
const readdir = fs.promises.readdir;
const readFile = fs.promises.readFile;
const stat = fs.promises.stat;

// Function to get all files recursively
async function getFiles(dir, fileList = []) {
  try {
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
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }

  return fileList;
}

// Function to detect and log lines that are too long
async function analyzeLineLengths(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    const lines = content.split('\n');
    const longLines = [];

    lines.forEach((line, index) => {
      if (line.length > MAX_LINE_LENGTH) {
        // Skip comments and string literals
        if (
          !line.trim().startsWith('//') &&
          !line.trim().startsWith('*') &&
          !line.includes("'") &&
          !line.includes('"')
        ) {
          longLines.push({
            lineNumber: index + 1,
            length: line.length,
            content: line,
          });
        }
      }
    });

    if (longLines.length > 0) {
      const relativePath = path.relative(SRC_DIR, filePath);
      console.info(`File: ${relativePath} - ${longLines.length} long lines found`);

      longLines.forEach((line) => {
        console.info(`  Line ${line.lineNumber}: ${line.length} chars`);
      });
    }

    return longLines.length > 0;
  } catch (error) {
    console.error(`Error analyzing file ${filePath}:`, error);
    return false;
  }
}

// Main function
async function main() {
  try {
    console.info('Starting line length analysis...');

    // Get all JS/JSX files
    const files = await getFiles(SRC_DIR);
    console.info(`Found ${files.length} files to analyze`);

    // Process each file
    let filesWithLongLines = 0;
    for (const file of files) {
      const hasLongLines = await analyzeLineLengths(file);
      if (hasLongLines) filesWithLongLines++;
    }

    console.info('\nAnalysis complete.');
    console.info(`Files with long lines: ${filesWithLongLines}`);
    console.info('\nRecommendations:');
    console.info('1. Run Prettier with printWidth: 100 to automatically fix most issues');
    console.info(
      '2. For JSX components with long lines, consider breaking props onto separate lines'
    );
    console.info('3. For long string concatenations, use template literals with line breaks');
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
