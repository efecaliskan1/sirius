import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const plistPath = path.join(projectRoot, 'ios', 'App', 'App', 'Info.plist');

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const result = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    result[key] = value;
  }

  return result;
}

function getReversedGoogleClientId(clientId) {
  if (typeof clientId !== 'string' || !clientId.endsWith('.apps.googleusercontent.com')) {
    return '';
  }

  return `com.googleusercontent.apps.${clientId.replace('.apps.googleusercontent.com', '')}`;
}

function upsertSimpleKey(xml, key, value) {
  const keyPattern = new RegExp(`\\n\\s*<key>${key}</key>\\s*<string>.*?<\\/string>`, 's');
  const replacement = `\n\t<key>${key}</key>\n\t<string>${value}</string>`;
  const withoutExistingKey = xml.replace(keyPattern, '');

  const rootDictEndIndex = withoutExistingKey.lastIndexOf('</dict>');

  if (rootDictEndIndex === -1) {
    return withoutExistingKey;
  }

  return `${withoutExistingKey.slice(0, rootDictEndIndex)}${replacement}\n${withoutExistingKey.slice(rootDictEndIndex)}`;
}

function upsertUrlTypes(xml, reversedClientId) {
  const block = `\t<key>CFBundleURLTypes</key>\n\t<array>\n\t\t<dict>\n\t\t\t<key>CFBundleURLSchemes</key>\n\t\t\t<array>\n\t\t\t\t<string>${reversedClientId}</string>\n\t\t\t</array>\n\t\t</dict>\n\t</array>`;

  if (!xml.includes('<key>CFBundleURLTypes</key>')) {
    return xml.replace('</dict>', `${block}\n</dict>`);
  }

  if (xml.includes(`<string>${reversedClientId}</string>`)) {
    return xml;
  }

  return xml.replace(
    /<key>CFBundleURLTypes<\/key>\s*<array>([\s\S]*?)<\/array>/,
    (match) => match.replace(
      '</array>',
      `\t\t<dict>\n\t\t\t<key>CFBundleURLSchemes</key>\n\t\t\t<array>\n\t\t\t\t<string>${reversedClientId}</string>\n\t\t\t</array>\n\t\t</dict>\n\t</array>`
    )
  );
}

if (!fs.existsSync(plistPath)) {
  console.log('[native-google] Info.plist bulunamadi, adim atlandi.');
  process.exit(0);
}

const env = {
  ...readEnvFile(path.join(projectRoot, '.env')),
  ...readEnvFile(path.join(projectRoot, '.env.local')),
};

const iosClientId = env.VITE_GOOGLE_IOS_CLIENT_ID || '';
const reversedClientId = getReversedGoogleClientId(iosClientId);

if (!iosClientId || !reversedClientId) {
  console.log('[native-google] iOS client ID bulunamadi, Info.plist guncellemesi atlandi.');
  process.exit(0);
}

const original = fs.readFileSync(plistPath, 'utf8');
const withClientId = upsertSimpleKey(original, 'GIDClientID', iosClientId);
const updated = upsertUrlTypes(withClientId, reversedClientId);

if (updated !== original) {
  fs.writeFileSync(plistPath, updated, 'utf8');
  console.log('[native-google] Info.plist Google Sign-In icin guncellendi.');
} else {
  console.log('[native-google] Info.plist zaten guncel.');
}
