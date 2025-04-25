import fs from "fs/promises";
import path from "path";

export async function getMessages(locale: string) {
  // Try loading from src/locales first (where the translations actually are)
  const srcLocalesDir = path.join(process.cwd(), "src", "locales", locale);
  try {
    const files = await fs.readdir(srcLocalesDir);
    let messages: Record<string, any> = {};

    for (const file of files) {
      if (file.endsWith(".json")) {
        const filePath = path.join(srcLocalesDir, file);
        const fileContent = await fs.readFile(filePath, "utf8");
        const namespace = file.replace(".json", "");
        messages[namespace] = JSON.parse(fileContent);
      }
    }

    return messages;
  } catch (error) {
    console.error(`Error loading translations from src/locales/${locale}:`, error);
    
    // Fallback to public/locales if src/locales fails
    const publicLocalesDir = path.join(process.cwd(), "public", "locales", locale);
    try {
      const files = await fs.readdir(publicLocalesDir);
      let messages: Record<string, any> = {};

      for (const file of files) {
        if (file.endsWith(".json")) {
          const filePath = path.join(publicLocalesDir, file);
          const fileContent = await fs.readFile(filePath, "utf8");
          const namespace = file.replace(".json", "");
          messages[namespace] = JSON.parse(fileContent);
        }
      }

      return messages;
    } catch (publicError) {
      console.error(`Error loading translations from public/locales/${locale}:`, publicError);
      
      // Fallback to just common.json if directory reading fails
      const commonFilePath = path.join(publicLocalesDir, "common.json");
      try {
        const fileContent = await fs.readFile(commonFilePath, "utf8");
        return { common: JSON.parse(fileContent) };
      } catch (e) {
        console.error("Failed to load even common.json:", e);
        return {}; // Return empty object as last resort
      }
    }
  }
}
