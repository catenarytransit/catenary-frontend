import { execSync } from 'child_process';
import fs from 'fs';

try {
const commitId = execSync('git rev-parse HEAD').toString().trim();
fs.writeFileSync('./src/data/commitId.js', `export const commitId = '${commitId}';`);
console.log('Commit ID written to src/data/commitId.js');
} catch (error) {
console.error('Error getting commit ID:', error.message);
process.exit(1);
}
