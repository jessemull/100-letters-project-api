const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const route = process.argv[2];

if (!route) {
  console.error("Please specify a route...");
  process.exit(1);
}

const routePath = path.join("src", "routes", route);

if (!fs.existsSync(routePath)) {
  console.error(`Route "${route}" not found...`);
  process.exit(1);
}

const distPath = path.join(routePath, "dist");
const nodeModulesPath = path.join(routePath, "node_modules");

try {
  if (fs.existsSync(distPath)) {
    console.log(`Removing dist folder for ${route}...`);
    execSync(`rm -rf ${distPath}`);
  }

  if (fs.existsSync(nodeModulesPath)) {
    console.log(`Removing node_modules for ${route}...`);
    execSync(`rm -rf ${nodeModulesPath}`);
  }

  console.log(`Cleanup complete for ${route}...`);
} catch (error) {
  console.error(`Failed to clean up ${route}...`, error);
  process.exit(1);
}
