// checkTranslations.ts

import * as fs from 'fs';
import * as path from 'path';

// --- Configuration ---
const translationsDir = path.join(__dirname, ''); // Directory containing JSON files (e.g., ./translations/)
const masterFileName = 'en.json'; // The master file to compare against
// -------------------

interface TranslationObject {
	[key: string]: string | TranslationObject;
}

/**
 * Recursively gets all keys from an object, using dot notation for nested keys.
 * @param obj The object to extract keys from.
 * @param prefix Internal use for recursion - current key prefix.
 * @returns An array of all keys (e.g., ['key1', 'nested.key2', 'nested.key3.subkey']).
 */
function getAllKeys(obj: TranslationObject | any, prefix: string = ''): string[] {
	let keys: string[] = [];

	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			const newKey = prefix ? `${prefix}.${key}` : key;
			keys.push(newKey);

			// If the value is a non-null object (and not an array), recurse
			if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
				keys = keys.concat(getAllKeys(obj[key], newKey));
			}
		}
	}
	return keys;
}

/**
 * Reads and parses a JSON file.
 * @param filePath Full path to the JSON file.
 * @returns The parsed JSON object or null if an error occurs.
 */
function readJsonFile(filePath: string): TranslationObject | null {
	try {
		const fileContent = fs.readFileSync(filePath, 'utf-8');
		return JSON.parse(fileContent) as TranslationObject;
	} catch (error: any) {
		console.error(`Error reading or parsing file ${path.basename(filePath)}:`, error.message);
		return null;
	}
}

// --- Main Logic ---

const masterFilePath = path.join(translationsDir, masterFileName);

console.log(`Reading master file: ${masterFilePath}`);
const masterData = readJsonFile(masterFilePath);

if (!masterData) {
	console.error(`Could not read or parse master file. Exiting.`);
	process.exit(1); // Exit with an error code
}

const masterKeys = new Set(getAllKeys(masterData));
console.log(`Found ${masterKeys.size} keys in master file (${masterFileName}).`);

let allFiles: string[];
try {
	allFiles = fs.readdirSync(translationsDir);
} catch (error: any) {
	console.error(`Error reading directory ${translationsDir}:`, error.message);
	process.exit(1);
}

const otherJsonFiles = allFiles.filter((file) => file.endsWith('.json') && file !== masterFileName);

console.log(`\nChecking ${otherJsonFiles.length} other JSON files in ${translationsDir}...`);

let totalWarnings = 0;

otherJsonFiles.forEach((fileName) => {
	const filePath = path.join(translationsDir, fileName);
	console.log(`\n--- Processing: ${fileName} ---`);
	const currentData = readJsonFile(filePath);

	if (!currentData) {
		console.warn(`Skipping ${fileName} due to read/parse errors.`);
		return; // Skip to the next file
	}

	const currentKeys = new Set(getAllKeys(currentData));
	let fileWarnings = 0;

	masterKeys.forEach((masterKey) => {
		if (!currentKeys.has(masterKey)) {
			console.warn(
				`WARNING: Key '${masterKey}' found in '${masterFileName}' but MISSING in '${fileName}'`
			);
			fileWarnings++;
			totalWarnings++;
		}
	});

	if (fileWarnings === 0) {
		console.log(`OK: All keys from '${masterFileName}' exist in '${fileName}'.`);
	} else {
		console.log(`Finished ${fileName} with ${fileWarnings} warnings.`);
	}
});

console.log('\n--- Check Complete ---');
if (totalWarnings > 0) {
	console.warn(`Total warnings generated: ${totalWarnings}`);
} else {
	console.log('All checked files contain all keys from the master file.');
}
