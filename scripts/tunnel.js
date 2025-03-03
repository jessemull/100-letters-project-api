require('dotenv').config();
const { exec } = require('child_process');

const sshPrivateKeyPath = process.env.SSH_PRIVATE_KEY_PATH;
const sshUser = process.env.SSH_USER;
const sshHost = process.env.SSH_HOST;
const dbHost = process.env.SSH_DB_HOST;
const sshCommand = `ssh -i ${sshPrivateKeyPath} -L 5432:${dbHost}:5432 ${sshUser}@${sshHost}`;

console.log(`Establishing SSH tunnel with the command: ${sshCommand}`);

exec(sshCommand, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error establishing SSH tunnel: ${error}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
});
