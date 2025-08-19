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

try {
	const commitDate = execSync(
		'git log -1 --format="%at" | xargs -I{} date -d @{} \"+%Y/%m/%d %H:%M:%S\"'
	)
		.toString()
		.trim();
	fs.appendFileSync('./src/data/commitId.js', `export const commitDate = '${commitDate}';`);
	console.log('Commit date written to src/data/commitId.js');
} catch (error) {
	console.error('Error getting commit date:', error.message);
	process.exit(1);
}
