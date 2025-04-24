import fs from 'fs/promises';
import path from 'path';

export async function getMessages(locale: string) {
  const filePath = path.join(process.cwd(), 'public', 'locales', locale, 'common.json');
  const fileContent = await fs.readFile(filePath, 'utf8');
  return JSON.parse(fileContent);
} 