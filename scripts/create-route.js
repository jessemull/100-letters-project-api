const fs = require('fs');
const path = require('path');

const routeName = process.argv[2];
const httpMethod = process.argv[3]?.toUpperCase();

if (!routeName || !httpMethod) {
  console.error("Usage: node scaffold-route.js <routeName> <HTTPMethod>");
  process.exit(1);
}

const templatesDir = path.join(__dirname, '../templates');
const routeDir = path.join(__dirname, `../src/routes/${routeName}`);

fs.mkdirSync(routeDir, { recursive: true });

const templateFiles = fs.readdirSync(templatesDir);

templateFiles.forEach((templateFile) => {
  const templatePath = path.join(templatesDir, templateFile);
  let fileContents = fs.readFileSync(templatePath, 'utf8');
  fileContents = fileContents
    .replace(/{{routeName}}/g, routeName)
    .replace(/{{HTTPMethod}}/g, httpMethod);
  const outputFileName = templateFile.replace('.template', '');
  const outputPath = path.join(routeDir, outputFileName);
  fs.writeFileSync(outputPath, fileContents);
});

console.log(`Route ${routeName} (${httpMethod}) scaffolded successfully at /src/routes/${routeName}...`);
