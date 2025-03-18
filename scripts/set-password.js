
require("dotenv").config();
const { AdminSetUserPasswordCommand, CognitoIdentityProviderClient } = require("@aws-sdk/client-cognito-identity-provider");

const userPoolId = process.env.COGNITO_USER_POOL_ID;
const username = process.env.COGNITO_USER_POOL_USERNAME;
const password = process.env.COGNITO_USER_POOL_PASSWORD;

const client = new CognitoIdentityProviderClient({
  region: "us-west-2"
});

async function setPermanentPassword() {
  const params = {
    UserPoolId: userPoolId,
    Username: username,
    Password: password,
    Permanent: true
  };

  try {
    const command = new AdminSetUserPasswordCommand(params);
    await client.send(command);
    console.log("Permanent password set successfully.");
  } catch (error) {
    console.error("Error setting permanent password: ", error);
  }
}

const setPassword = async () => {
  await setPermanentPassword()
}

setPassword()