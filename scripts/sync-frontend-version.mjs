import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const requestedVersion = process.argv[2];
const checkOnly = process.argv.includes('--check');

if (!requestedVersion || !/^\d+\.\d+\.\d+\.\d+$/.test(requestedVersion)) {
  throw new Error(`Expected a four-part numeric version, received '${requestedVersion || ''}'.`);
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const packageJsonPath = path.join(repositoryRoot, 'package.json');
const packageLockPath = path.join(repositoryRoot, 'package-lock.json');

async function readJson(filePath) {
  const source = await readFile(filePath, 'utf8');
  return {
    data: JSON.parse(source),
    newline: source.includes('\r\n') ? '\r\n' : '\n',
    source
  };
}

function assertVersion(actualVersion, location) {
  if (actualVersion !== requestedVersion) {
    throw new Error(`${location} is '${actualVersion || ''}', expected '${requestedVersion}'.`);
  }
}

async function writeJson(filePath, document) {
  const output = `${JSON.stringify(document.data, null, 2)}\n`.replace(/\n/g, document.newline);
  if (output !== document.source) {
    await writeFile(filePath, output, 'utf8');
  }
}

const packageJson = await readJson(packageJsonPath);
const packageLock = await readJson(packageLockPath);
const lockRoot = packageLock.data.packages?.[''];

if (!lockRoot) {
  throw new Error('package-lock.json does not contain the root package entry.');
}

if (checkOnly) {
  assertVersion(packageJson.data.version, 'package.json version');
  assertVersion(packageLock.data.version, 'package-lock.json version');
  assertVersion(lockRoot.version, 'package-lock.json root package version');
  console.log(`Frontend package version ${requestedVersion} is synchronized.`);
} else {
  packageJson.data.version = requestedVersion;
  packageLock.data.version = requestedVersion;
  lockRoot.version = requestedVersion;
  await Promise.all([writeJson(packageJsonPath, packageJson), writeJson(packageLockPath, packageLock)]);
  console.log(`Synchronized frontend package version to ${requestedVersion}.`);
}
