/**
 * Script to fix max-len issues in specific files
 * Uses Prettier to format long lines with reduced printWidth
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

// Setup ES Module equivalents of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const ROOT_DIR = path.join(__dirname, '..');
const FILES_TO_FIX = [
  'src/Login.jsx',
  'src/components/LoadingSpinner.jsx',
  'src/components/SplashScreen.jsx',
  'src/dashboard/BaseDashboard.jsx',
  'src/dashboard/UnifiedReporting.jsx',
  'src/dashboard/admin/ReportGenerator.jsx',
  'src/main.jsx',
  'scripts/generateHealthReport.js',
];

// Main function
async function main() {
  try {
    console.info('Starting to fix long lines...');

    // Process each file
    for (const relativeFilePath of FILES_TO_FIX) {
      const filePath = path.join(ROOT_DIR, relativeFilePath);
      console.info(`Formatting ${relativeFilePath}...`);

      // Use Prettier with a lower printWidth specifically for these files
      const result = spawnSync(
        'npx',
        [
          'prettier',
          '--write',
          '--print-width',
          '70', // Reduce print width further for better line breaking
          filePath,
        ],
        {
          cwd: ROOT_DIR,
          encoding: 'utf8',
          shell: true,
        }
      );

      if (result.error) {
        console.error(`Error formatting ${relativeFilePath}:`, result.error);
      } else if (result.status !== 0) {
        console.error(`Prettier failed for ${relativeFilePath}:`, result.stderr);
      } else {
        console.info(`Successfully formatted ${relativeFilePath}`);
      }
    }

    console.info('\nCompleted formatting long lines in specific files.');
    console.info('Run "npm run lint:fix" to verify fixes.');
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
