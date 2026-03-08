const fs = require('fs');
const code = fs.readFileSync('./email-app/src/components/BulkEmail.js', 'utf8');
const lines = code.split('\n');

let depth = 0;
let inBulk = false;
let startLine = -1;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('const bulkContent = (')) {
    inBulk = true;
    startLine = i + 1;
    continue;
  }
  if (inBulk) {
    const openDivs = (line.match(/<div[\s>]/g) || []).length;
    const closeDivs = (line.match(/<\/div>/g) || []).length;
    const openSpans = (line.match(/<span[\s>]/g) || []).length;
    const closeSpans = (line.match(/<\/span>/g) || []).length;
    const prev = depth;
    depth += openDivs - closeDivs + openSpans - closeSpans;
    // Report when depth goes lower than expected (suggesting premature close)
    if (closeDivs > 0 || closeSpans > 0) {
      process.stdout.write(`Line ${i+1} (depth ${prev}->${depth}): ${line.trim().substring(0, 80)}\n`);
    }
    if (line.trim() === ');') {
      console.log(`\nFinal depth at line ${i+1}: ${depth}`);
      break;
    }
  }
}
