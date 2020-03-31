const express = require("express")
const bodyParser = require("body-parser")
const Moneyhub = require("../../src")
const config = require("../config")
const LOCAL_IDENTITY_URL = "http://identity.dev.127.0.0.1.nip.io/oidc"
const LOCAL_ACCOUNT_CONNECT_URL = "http://localhost:3001/account-connect.js" // Bank chooser
const LOCAL_REDIRECT_URI = "http://localhost:3001"
// Go to
//       http://localhost:3001?userId=your-user-id

const DEFAULT_USER_ID = "5dfb65ac2bde10def015180e"

const run = async () => {
  const {
    identityServiceUrl = LOCAL_IDENTITY_URL,
    accountConnectUrl = LOCAL_ACCOUNT_CONNECT_URL,
    accountConnectJsUrl = LOCAL_ACCOUNT_CONNECT_URL.replace(
      "connect.js",
      "connect-js.js"
    ),
    client: {client_id: clientId, redirect_uri = LOCAL_REDIRECT_URI},
  } = config
  const moneyhub = await Moneyhub(config)
  const app = express()
  app.use(express.static('public'));
  // set the view engine to ejs
  app.set('view engine', 'ejs');
  const [identityUrl] = identityServiceUrl.split("/oidc")

  app.get("/", (req, res) => {
    const {userId = DEFAULT_USER_ID} = req.query || {}

    res.send(`
    <html>
    <body>
    <h3>Nationwide-Homehub</h3>
    <p>We need your financial details to proceed:</p>
    <script
    data-clientid="${clientId}"
    data-userid="${userId}"
    data-redirecturi="${redirect_uri}"
    data-posturi="/result"
    data-finishuri="/finish"
    data-type="test"
    data-identityuri="${identityUrl}"
    src="${accountConnectUrl}"></script>

    `)
  })
  app.get("/account-connect.js", (req, res) => {
    res.sendFile('/Users/nitgoel0/Documents/moneyhub/moneyhub-api-client/public/account-connect.js');
  })

  app.get("/finish", (req, res) => {
    res.send(`
      <h3>Finish</h3>
      <a href="/">Start again</a>
    `)
  })

  app.post("/result", bodyParser.json(), async (req, res) => {
    const data = req.body
    const tokens = await moneyhub.exchangeCodeForTokens(data)
    console.log(tokens)
    // const accounts = await moneyhub.getAccountsWithToken(tokens.access_token)
    // const transactions = await moneyhub.getTransactionsWithToken(tokens.access_token)
    const categories = await moneyhub.getCategoriessWithToken(tokens.access_token)
    console.log(categories)
    // req.session.access_token=tokens.access_token
    // req.redirect("/finish")
    res.send(categories)
  })

  app.listen(3001, () => console.log("Example widget server listening on 3001"))
}

run()
