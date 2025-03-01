require('dotenv').config();
const { spawn } = require('child_process');

// Load environment variables
const sshPrivateKeyPath = process.env.SSH_PRIVATE_KEY_PATH;
const sshUser = process.env.SSH_USER;
const sshHost = process.env.SSH_HOST;
const dbHost = process.env.SSH_DB_HOST;
const dbUser = process.env.DB_USER;
const dbName = process.env.DB_NAME;
const dbPassword = process.env.DB_PASSWORD;

// Command to establish the SSH tunnel
const sshCommand = `ssh -i ${sshPrivateKeyPath} -L 5432:${dbHost}:5432 ${sshUser}@${sshHost} -f -N`;

// Establish the SSH tunnel
console.log(`Establishing SSH tunnel with the command: ${sshCommand}`);

const sshProcess = spawn(sshCommand, {
  shell: true, // Ensure the command runs as a shell command
});

sshProcess.stdout.on('data', (data) => {
  console.log(`SSH Tunnel stdout: ${data}`);
});

sshProcess.stderr.on('data', (data) => {
  console.error(`SSH Tunnel stderr: ${data}`);
});

sshProcess.on('close', (code) => {
  console.log(`SSH tunnel process exited with code ${code}`);
  
  // Now that the tunnel is up, connect to the database
  const psqlCommand = `PGPASSWORD=${dbPassword} psql -h localhost -U ${dbUser} -d ${dbName} -p 5432`;

  console.log(`Connecting to PostgreSQL using: ${psqlCommand}`);

  const psqlProcess = spawn(psqlCommand, {
    shell: true,
    stdio: 'inherit', // This allows the psql command to use the same terminal session for input/output
  });

  psqlProcess.on('close', (code) => {
    console.log(`psql process exited with code ${code}`);
  });
});