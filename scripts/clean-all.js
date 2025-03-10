const { exec } = require("child_process");
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

const removeDir = (dirPath) => {
  return new Promise((resolve, reject) => {
    exec(`rm -rf ${dirPath}`, (error, stdout, stderr) => {
      if (error) {
        reject(`Failed to remove ${dirPath}`);
        return;
      }
      resolve(stdout || stderr);
    });
  });
};

const cleanup = async () => {
  try {
    console.log("Starting cleanup in parallel...");

    const cleanupPromises = routes.map((route) => {
      const routePath = path.join(routesDir, route);
      const distPath = path.join(routePath, "dist");
      const nodeModulesPath = path.join(routePath, "node_modules");

      const promises = [];

      if (fs.existsSync(distPath)) {
        console.log(`Removing dist folder for ${route}...`);
        promises.push(removeDir(distPath));
      }

      if (fs.existsSync(nodeModulesPath)) {
        console.log(`Removing node_modules for ${route}...`);
        promises.push(removeDir(nodeModulesPath));
      }

      return Promise.all(promises);
    });

    await Promise.all(cleanupPromises);

    console.log("Cleanup complete for all packages...");
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

cleanup();
