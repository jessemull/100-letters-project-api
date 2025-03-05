const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const route = process.argv[2];

if (!route) {
  console.error("Please specify a route...");
  process.exit(1);
}

const routePath = path.join("src", "routes", route);
const packageJsonPath = path.join(routePath, "package.json");

if (fs.existsSync(packageJsonPath)) {
  try {
    console.log(`Installing dependencies for ${route}...`);
    execSync(`npm install`, { cwd: routePath, stdio: "inherit" });
  } catch (error) {
    console.error(`Failed to install dependencies for ${route}...`);
    process.exit(1);
  }
} else {
  console.warn(`No package.json found in ${routePath}, skipping npm install...`);
}

