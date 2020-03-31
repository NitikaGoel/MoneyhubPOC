
const config = {
  resourceServerUrl: "https://api.moneyhub.co.uk/v2.0",
  identityServiceUrl: "https://identity.moneyhub.co.uk/oidc",
  accountConnectUrl: "http://localhost:3001/account-connect.js",
  client: {
    client_id: "dd167d29-6fe4-4e73-affe-1371d468c654",
    client_secret: "a26609a6-a7bc-4567-bcde-63a2d99963a5",
    token_endpoint_auth_method: "client_secret_basic",
    id_token_signed_response_alg: "RS256",
    request_object_signing_alg: "none",
    redirect_uri: "http://localhost:3001/auth/callback",
    response_type: "code",
    keys: [/* your jwks */],
  },
}

module.exports = config
