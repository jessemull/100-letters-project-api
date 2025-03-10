const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const routesDir = path.join("src", "routes");

const routes = fs.readdirSync(routesDir).filter((dir) =>
  fs.statSync(path.join(routesDir, dir)).isDirectory()
);

if (routes.length === 0) {
  console.error("No routes found...");
  process.exit(1);
}

const runBuild = (routePath) => {
  return new Promise((resolve, reject) => {
    exec("npm run build", { cwd: routePath }, (error, stdout, stderr) => {
      if (error) {
        reject(`Build failed for ${routePath}: ${stderr || error.message}`);
        return;
      }
      resolve(stdout || stderr);
    });
  });
};

const buildRoutes = async () => {
  try {
    console.log("Starting builds in parallel...");

    const buildPromises = routes.map((route) => {
      const routePath = path.join(routesDir, route);
      const packageJsonPath = path.join(routePath, "package.json");
      
      if (fs.existsSync(packageJsonPath)) {
        console.log(`Running build for ${route}...`);
        return runBuild(routePath);
      } else {
        console.warn(`No package.json found in ${routePath}, skipping build...`);
        return Promise.resolve();
      }
    });

    await Promise.all(buildPromises);

    console.log("All builds completed successfully!");
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

buildRoutes();
