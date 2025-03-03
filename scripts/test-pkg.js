const { execSync } = require("child_process");

const route = process.argv[2];

if (!route) {
  console.error("Please specify a route...");
  process.exit(1);
}

try {
  console.log(`Running tests for ${route}...`);
  execSync(`jest --testPathPattern=routes/${route}/`, { stdio: "inherit" });
} catch (error) {
  console.error("Testing failed...");
  process.exit(1);
}