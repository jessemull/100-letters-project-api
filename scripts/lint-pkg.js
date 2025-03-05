const { execSync } = require("child_process");

const route = process.argv[2];

if (!route) {
  console.error("Please specify a route...");
  process.exit(1);
}

const routePath = `src/routes/${route}`;

try {
  console.log(`Running ESLint for ${route}...`);
  execSync(`eslint ${routePath} --ext .ts`, { stdio: "inherit" });
} catch (error) {
  console.error("Linting failed...");
  process.exit(1);
}