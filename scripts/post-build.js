const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

if (!fs.existsSync("dist")) {
  fs.mkdirSync("dist", { recursive: true });
}

fs.copyFileSync("package.json", "dist/package.json");

if (fs.existsSync("package-lock.json")) {
  fs.copyFileSync("package-lock.json", "dist/package-lock.json");
}

if (!fs.existsSync("dist/prisma")) {
  fs.mkdirSync("dist/prisma", { recursive: true });
}

fs.copyFileSync("../../../prisma/schema.prisma", "dist/prisma/schema.prisma");

execSync("npm install --omit=dev --prefix dist", { stdio: "inherit" });

execSync("cd dist && prisma generate --schema=prisma/schema.prisma", { stdio: "inherit" });

console.log("Post-build script completed...");
