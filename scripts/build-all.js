const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const routesDir = path.join("src", "routes");

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
      console.log(`Running build for ${route}...`);
      execSync(`npm run build`, { cwd: routePath, stdio: "inherit" });
    } catch (error) {
      console.error(`Build failed for ${route}...`);
      process.exit(1);
    }
  } else {
    console.warn(`No package.json found in ${routePath}, skipping build...`);
  }
});

console.log("All builds completed successfully!");
