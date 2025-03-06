require('dotenv').config();
const { exec } = require('child_process');

const sshPrivateKeyPath = process.env.SSH_PRIVATE_KEY_PATH;
const sshUser = process.env.SSH_USER;
const sshHost = process.env.SSH_HOST;

const sshCommand = `ssh -i ${sshPrivateKeyPath} -p 22 ${sshUser}@${sshHost}`;

console.log(`Connecting to bastion host with the command: ${sshCommand}...`);

exec(sshCommand, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error connecting to bastion host: ${error}...`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
});
