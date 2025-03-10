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

const runInstall = (routePath) => {
  return new Promise((resolve, reject) => {
    exec("npm install", { cwd: routePath, stdio: "inherit" }, (error, stdout, stderr) => {
      if (error) {
        reject(`Failed to install dependencies for ${routePath}`);
        return;
      }
      resolve(stdout || stderr);
    });
  });
};

const installDependencies = async () => {
  try {
    console.log("Starting npm installs in parallel...");
    
    const installPromises = routes.map((route) => {
      const routePath = path.join(routesDir, route);
      const packageJsonPath = path.join(routePath, "package.json");
      
      if (fs.existsSync(packageJsonPath)) {
        console.log(`Installing dependencies for ${route}...`);
        return runInstall(routePath);
      } else {
        console.warn(`No package.json found in ${routePath}, skipping npm install...`);
        return Promise.resolve();
      }
    });

    await Promise.all(installPromises);

    console.log("All packages installed successfully!");
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

installDependencies();
