import fs from 'fs';
import path from 'path';

const searchPath = 'C:/Users/Shubham/.gemini/antigravity/scratch/familysphere/frontend/src/App.jsx';
const query = process.argv[2] || 'showAddMemberModal';

const content = fs.readFileSync(searchPath, 'utf8');
const lines = content.split('\n');

console.log(`Searching for "${query}" in ${searchPath}:`);
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes(query.toLowerCase())) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
