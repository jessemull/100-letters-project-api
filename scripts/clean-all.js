const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const routesDir = path.join("src", "routes");

const routes = fs.readdirSync(routesDir).filter((dir) =>
  fs.statSync(path.join(routesDir, dir)).isDirectory()
);

if (routes.length === 0) {
  console.error("No routes found in src/routes/");
  process.exit(1);
}

routes.forEach((route) => {
  const routePath = path.join(routesDir, route);
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
  } catch (error) {
    console.error(`Failed to clean up ${route}...`, error);
    process.exit(1);
  }
});

console.log("Cleanup complete for all packages...");
