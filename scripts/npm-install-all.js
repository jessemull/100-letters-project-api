const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const routesDir = path.join("src", "routes");

// Get all subdirectories inside src/routes
const routes = fs.readdirSync(routesDir).filter((dir) => {
  return fs.statSync(path.join(routesDir, dir)).isDirectory();
});

if (routes.length === 0) {
  console.error("No routes found...");
  process.exit(1);
}

routes.forEach((route) => {
  const routePath = path.join(routesDir, route);
  const packageJsonPath = path.join(routePath, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    try {
      console.log(`Installing dependencies for ${route}...`);
      execSync(`npm install`, { cwd: routePath, stdio: "inherit" });
    } catch (error) {
      console.error(`Failed to install dependencies for ${route}.`);
      process.exit(1);
    }
  } else {
    console.warn(`No package.json found in ${routePath}, skipping npm install...`);
  }
});

console.log("All packages installed successfully!");
