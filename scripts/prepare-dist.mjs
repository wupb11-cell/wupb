import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");

async function main() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(path.join(distDir, "data"), { recursive: true });

  await cp(path.join(root, "index.html"), path.join(distDir, "index.html"));
  await cp(path.join(root, "styles.css"), path.join(distDir, "styles.css"));
  await cp(path.join(root, "app.js"), path.join(distDir, "app.js"));
  await cp(path.join(root, "data", "tools.js"), path.join(distDir, "data", "tools.js"));

  await writeFile(path.join(distDir, ".nojekyll"), "", "utf8");

  console.log(`Prepared ${path.relative(root, distDir)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
