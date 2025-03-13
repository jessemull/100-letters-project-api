const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const route = process.argv[2];

if (!route) {
  console.error("Please specify a route...");
  process.exit(1);
}

const routePath = path.join("src", "routes", route);
const distPath = path.join(routePath, "dist");

if (fs.existsSync(distPath)) {
  try {
    console.log(`Packaging build for ${route}...`);
    execSync(`npm run package`, { cwd: routePath, stdio: "inherit" });
  } catch (error) {
    console.error(`Failed to package build for ${route}...`);
    process.exit(1);
  }
} else {
  console.warn(`No dist directory found in ${routePath}, skipping...`);
}
