import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const distDirectory = new URL("../dist", import.meta.url);
const maxTotalJavaScriptBytes = 5 * 1024 * 1024;
const maxSingleJavaScriptBytes = 4.6 * 1024 * 1024;

const collectJavaScriptFiles = (directoryPath) => {
  const entries = readdirSync(directoryPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectJavaScriptFiles(entryPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(entryPath);
    }
  }

  return files;
};

if (!existsSync(distDirectory)) {
  throw new Error("Mobile web export directory is missing. Run `npm --prefix apps/mobile run export:web` first.");
}

const javaScriptFiles = collectJavaScriptFiles(distDirectory.pathname);

if (javaScriptFiles.length === 0) {
  throw new Error("Mobile web export did not produce any JavaScript files.");
}

const fileSizes = javaScriptFiles.map((filePath) => ({
  filePath,
  size: statSync(filePath).size,
}));
const totalJavaScriptBytes = fileSizes.reduce((sum, file) => sum + file.size, 0);
const largestJavaScriptFile = fileSizes.reduce((largest, file) => (file.size > largest.size ? file : largest));

if (totalJavaScriptBytes > maxTotalJavaScriptBytes) {
  throw new Error(
    `Mobile web JS bundle budget exceeded: total=${totalJavaScriptBytes} max=${maxTotalJavaScriptBytes}.`
  );
}

if (largestJavaScriptFile.size > maxSingleJavaScriptBytes) {
  throw new Error(
    `Mobile web JS bundle budget exceeded: largest=${largestJavaScriptFile.size} max=${maxSingleJavaScriptBytes} file=${largestJavaScriptFile.filePath}.`
  );
}

console.log(
  `mobile-web-bundle-budget:pass|files:${javaScriptFiles.length}|totalBytes:${totalJavaScriptBytes}|largestBytes:${largestJavaScriptFile.size}`
);
