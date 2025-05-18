/**
 * QCheckCITE Project Health Report Generator
 *
 * This script analyzes the codebase and generates a health report,
 * including TODOs, console logs, and other code quality metrics.
 *
 * Usage: node generateHealthReport.js
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

// Configuration
const SRC_DIR = path.join(__dirname, '..', 'src');
const IGNORE_DIRS = ['node_modules', 'dist', 'build', '.git'];
const IGNORE_FILES = ['.DS_Store', '.gitignore'];
const CODE_FILE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.css'];

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

// Function to analyze a single file
async function analyzeFile(filePath) {
  const content = await readFile(filePath, 'utf8');
  const lines = content.split('\n');
  const fileName = path.relative(SRC_DIR, filePath);

  const analysis = {
    fileName,
    lineCount: lines.length,
    todos: [],
    consoleStatements: [],
    commentPercentage: 0,
    vulnerabilities: [],
  };

  let commentLines = 0;

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmedLine = line.trim();

    // Count comments
    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.includes('*/')) {
      commentLines++;
    }

    // Find TODOs
    if (trimmedLine.toLowerCase().includes('todo')) {
      analysis.todos.push({ line: lineNum, content: trimmedLine });
    }

    // Find console statements
    if (trimmedLine.includes('console.log') ||
        trimmedLine.includes('console.warn') ||
        trimmedLine.includes('console.error')) {
      analysis.consoleStatements.push({ line: lineNum, content: trimmedLine });
    }

    // Check for potential vulnerabilities
    if (trimmedLine.includes('innerHTML') ||
        trimmedLine.includes('dangerouslySetInnerHTML') ||
        trimmedLine.includes('eval(')) {
      analysis.vulnerabilities.push({
        line: lineNum,
        content: trimmedLine,
        type: trimmedLine.includes('innerHTML') ? 'innerHTML' :
              trimmedLine.includes('dangerouslySetInnerHTML') ? 'dangerouslySetInnerHTML' : 'eval'
      });
    }
  });

  analysis.commentPercentage = (commentLines / lines.length * 100).toFixed(2);

  return analysis;
}

// Generate the report
async function generateReport() {
  console.log('Generating QCheckCITE project health report...');

  try {
    const allFiles = await getFiles(SRC_DIR);
    console.log(`Found ${allFiles.length} files to analyze`);

    const fileAnalyses = [];

    for (const filePath of allFiles) {
      const analysis = await analyzeFile(filePath);
      fileAnalyses.push(analysis);
    }

    // Aggregate results
    const totalLines = fileAnalyses.reduce((sum, file) => sum + file.lineCount, 0);
    const totalTodos = fileAnalyses.reduce((sum, file) => sum + file.todos.length, 0);
    const totalConsoleStatements = fileAnalyses.reduce((sum, file) => sum + file.consoleStatements.length, 0);
    const totalVulnerabilities = fileAnalyses.reduce((sum, file) => sum + file.vulnerabilities.length, 0);

    const filesWithMostTodos = [...fileAnalyses]
      .sort((a, b) => b.todos.length - a.todos.length)
      .slice(0, 5);

    const filesWithMostConsoleStatements = [...fileAnalyses]
      .sort((a, b) => b.consoleStatements.length - a.consoleStatements.length)
      .slice(0, 5);

    const filesWithLeastComments = [...fileAnalyses]
      .filter(file => file.lineCount > 10) // Ignore very small files
      .sort((a, b) => parseFloat(a.commentPercentage) - parseFloat(b.commentPercentage))
      .slice(0, 5);

    // Generate report content
    const reportDate = new Date().toISOString().split('T')[0];
    let report = `# QCheckCITE Project Health Report - ${reportDate}\n\n`;

    report += `## Overview\n\n`;
    report += `- Total Files Analyzed: ${allFiles.length}\n`;
    report += `- Total Lines of Code: ${totalLines}\n`;
    report += `- TODO Items: ${totalTodos}\n`;
    report += `- Console Statements: ${totalConsoleStatements}\n`;
    report += `- Potential Vulnerabilities: ${totalVulnerabilities}\n\n`;

    report += `## Files with Most TODOs\n\n`;
    filesWithMostTodos.forEach(file => {
      report += `- ${file.fileName} (${file.todos.length} TODOs)\n`;
      file.todos.forEach(todo => {
        report += `  - Line ${todo.line}: ${todo.content}\n`;
      });
      report += '\n';
    });

    report += `## Files with Most Console Statements\n\n`;
    filesWithMostConsoleStatements.forEach(file => {
      report += `- ${file.fileName} (${file.consoleStatements.length} statements)\n`;
    });
    report += '\n';

    report += `## Files with Least Comments\n\n`;
    filesWithLeastComments.forEach(file => {
      report += `- ${file.fileName} (${file.commentPercentage}% comments, ${file.lineCount} lines)\n`;
    });
    report += '\n';

    if (totalVulnerabilities > 0) {
      report += `## Potential Vulnerabilities\n\n`;
      fileAnalyses.forEach(file => {
        if (file.vulnerabilities.length > 0) {
          report += `- ${file.fileName}\n`;
          file.vulnerabilities.forEach(vuln => {
            report += `  - Line ${vuln.line}: ${vuln.type} - ${vuln.content}\n`;
          });
        }
      });
      report += '\n';
    }

    report += `## Recommendations\n\n`;

    if (totalTodos > 0) {
      report += `- Address the ${totalTodos} TODO items in the codebase\n`;
    }

    if (totalConsoleStatements > 0) {
      report += `- Remove or replace ${totalConsoleStatements} console statements with proper logging\n`;
    }

    if (filesWithLeastComments.length > 0) {
      report += `- Improve documentation in files with low comment percentages\n`;
    }

    if (totalVulnerabilities > 0) {
      report += `- Review and fix the ${totalVulnerabilities} potential security vulnerabilities\n`;
    }

    // Write report to file
    const reportPath = path.join(__dirname, '..', 'docs', 'project-health-report.md');
    fs.writeFileSync(reportPath, report);

    console.log(`Report generated successfully: ${reportPath}`);
  } catch (error) {
    console.error('Error generating report:', error);
  }
}

// Run the report generator
generateReport();
