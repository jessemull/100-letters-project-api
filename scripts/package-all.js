const { exec } = require("child_process");
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

const runPackage = (routePath) => {
  return new Promise((resolve, reject) => {
    exec("npm run package", { cwd: routePath, stdio: "inherit" }, (error, stdout, stderr) => {
      if (error) {
        reject(`Failed to package build for ${routePath}`);
        return;
      }
      resolve(stdout || stderr);
    });
  });
};

const runPackaging = async () => {
  try {
    console.log("Starting to package builds in parallel...");

    const packagePromises = routes.map((route) => {
      const routePath = path.join(routesDir, route);
      const distPath = path.join(routePath, "dist");

      if (fs.existsSync(distPath)) {
        console.log(`Packaging build for ${route}...`);
        return runPackage(routePath);
      } else {
        console.warn(`No dist directory found in ${routePath}, skipping...`);
        return Promise.resolve();
      }
    });

    await Promise.all(packagePromises);

    console.log("All builds packaged successfully!");
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

runPackaging();
