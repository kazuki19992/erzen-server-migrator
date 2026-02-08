import { mkdir, copyFile } from "fs/promises";
import path from "path";

const root = new URL("..", import.meta.url).pathname;
const srcHtml = path.join(root, "src", "index.html");
const distDir = path.join(root, "dist");
const destHtml = path.join(distDir, "index.html");

await mkdir(distDir, { recursive: true });
await copyFile(srcHtml, destHtml);
