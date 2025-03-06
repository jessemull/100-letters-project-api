const fs = require('fs');
const path = require('path');

const routeName = process.argv[2];

if (!routeName) {
  console.error("Please provide a route name.");
  process.exit(1);
}

const templatesDir = path.join(__dirname, '../templates');
const routeDir = path.join(__dirname, `../src/routes/${routeName}`);

fs.mkdirSync(routeDir, { recursive: true });

const templateFiles = fs.readdirSync(templatesDir);

templateFiles.forEach((templateFile) => {
  const templatePath = path.join(templatesDir, templateFile);
  const fileContents = fs.readFileSync(templatePath, 'utf8');
  const outputContents = fileContents.replace(/{{routeName}}/g, routeName);
  const outputFileName = templateFile.replace('.template', '');
  const outputPath = path.join(routeDir, outputFileName);
  fs.writeFileSync(outputPath, outputContents);
});

console.log(`Route ${routeName} scaffolded successfully at /src/routes/${routeName}...`);
