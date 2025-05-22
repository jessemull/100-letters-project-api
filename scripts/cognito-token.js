require("dotenv").config();
const { CognitoIdentityProviderClient, InitiateAuthCommand } = require("@aws-sdk/client-cognito-identity-provider")

const userPoolWebClientId = process.env.COGNITO_USER_POOL_CLIENT_ID;
const username = process.env.COGNITO_USER_POOL_USERNAME;
const password = process.env.COGNITO_USER_POOL_PASSWORD;

const client = new CognitoIdentityProviderClient({
  region: "us-west-2"
});

async function authenticateUser() {
  const params = {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: userPoolWebClientId,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password
    }
  };

  try {
    const command = new InitiateAuthCommand(params);
    const response = await client.send(command);
    console.log("Access Token:");
    console.log(response.AuthenticationResult.AccessToken)
  } catch (error) {
    console.error("Error authenticating user:", error);
  }
}

const getToken = async () => {
  await authenticateUser()
}

getToken();
