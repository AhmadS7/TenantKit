const fs = require('fs');
const path = require('path');

const MAX_FILE_LINES = 350;
const MAX_FUNCTION_LINES = 50;

function scanDirectory(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (['node_modules', 'dist', '.next', '.git', 'coverage'].includes(file)) continue;
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      scanDirectory(filePath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function analyzeMetrics() {
  console.log('--------------------------------------------------');
  console.log('   ENGINEERING QUALITY & COMPLEXITY METRICS       ');
  console.log('--------------------------------------------------');

  const rootFiles = scanDirectory(path.join(__dirname, '..', 'src'));
  const frontendFiles = scanDirectory(path.join(__dirname, '..', 'frontend', 'src'));
  const allFiles = [...rootFiles, ...frontendFiles];

  let totalLines = 0;
  let largeFiles = [];
  let complexFunctionsCount = 0;
  let todoCount = 0;

  for (const filePath of allFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    totalLines += lines.length;

    if (lines.length > MAX_FILE_LINES) {
      largeFiles.push({ file: path.relative(process.cwd(), filePath), lines: lines.length });
    }

    // Basic Cyclomatic Complexity heuristic: counting control statements
    const controlKeywords = (content.match(/\b(if|else|switch|case|for|while|catch|&&|\|\||\?)\b/g) || []).length;
    if (controlKeywords > 15) {
      complexFunctionsCount++;
    }

    // Technical Debt tracking via TODO / FIXME comments
    const todos = (content.match(/\b(TODO|FIXME|HACK|XXX)\b/gi) || []).length;
    todoCount += todos;
  }

  console.log(`- Total Files Scanned: ${allFiles.length}`);
  console.log(`- Total Lines of Code: ${totalLines}`);
  console.log(`- High-Complexity Modules Detected: ${complexFunctionsCount}`);
  console.log(`- Technical Debt Markers (TODOs/FIXMEs): ${todoCount}`);
  console.log(`- Files Exceeding ${MAX_FILE_LINES} Lines: ${largeFiles.length}`);

  if (largeFiles.length > 0) {
    console.log('\n[WARNING] Large Files Requiring Refactoring:');
    largeFiles.forEach((f) => console.log(`  - ${f.file}: ${f.lines} lines`));
  }

  console.log('\n[SUCCESS] Engineering metrics scan completed successfully.');
}

analyzeMetrics();
