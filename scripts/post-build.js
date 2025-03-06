const { execSync } = require("child_process");
const fs = require("fs");

if (!fs.existsSync("dist")) {
  fs.mkdirSync("dist", { recursive: true });
}

fs.copyFileSync("package.json", "dist/package.json");

if (fs.existsSync("package-lock.json")) {
  fs.copyFileSync("package-lock.json", "dist/package-lock.json");
}

execSync("npm install --omit=dev --prefix dist", { stdio: "inherit" });

console.log("Post-build script completed...");
