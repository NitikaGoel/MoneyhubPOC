/* eslint-disable max-statements*/
const express = require("express")
const bodyParser = require("body-parser")
const Moneyhub = require("../../src")
const config = require("../config")
var path = require('path');
const {DEFAULT_STATE, DEFAULT_NONCE,DEFAULT_DATA_SCOPES_USE_CASE_2} = require("../constants")
var sortJsonArray = require('sort-json-array');


// API CLIENT SHOULD HAVE THE REDIRECT URL SET TO:
// 'http://localhost:3001/auth/callback'

const getBanks = async moneyhub => {
  const banks = await moneyhub.listAPIConnections()
  const testBanks = await moneyhub.listTestConnections()
  return banks.concat(testBanks)
 
}
const cookieSession = require('cookie-session');
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
function createHtmlfromJson(columns,jsonObject,type) {
    var headerRows='';
    var bodyRows='';
    columns.map(function(colName) {
        headerRows += '<th>'+ capitalizeFirstLetter(colName)+'</th>'
      }  
    )
    jsonObject.map(function(row) {
      bodyRows += '<tr>'
      columns.map(function(colName) {
        if(colName=='date' || colName=='dateModified') {
            var mydate = new Date(row[colName]).toDateString();
            bodyRows += '<td>' + mydate + '</td>';
        } else if(colName=='amount'){
          bodyRows += '<td>' + row[colName]['value'] + '</td>';
        } else if(colName=='currency' && (type ==='transactions' || type ==='income')) {
          bodyRows += '<td>' + row['amount'][colName] + '</td>';
        } 
       else if(colName=='category'&& type ==='category') {
        bodyRows += '<td>' + row['key'] + '</td>';
      } 
        else if(colName=='balance') {
          bodyRows += '<td>' + row[colName]['amount']['value'] + '</td>';
        } else if(colName=='balanceDate') {
          bodyRows += '<td>' + row['balance']['date'] + '</td>';
        } else if(colName=='transactionCount') {
          if(row['transactionData']) {
            bodyRows += '<td>' + row['transactionData']['count'] + '</td>';
          } else {
            bodyRows += '<td>' + "" + '</t  d>';
          }
        } else if(colName=='lastTransactionDate') {
          if(row['transactionData']) {
            var newdate = new Date(row['transactionData']['lastDate']).toDateString();
            bodyRows += '<td>' + newdate + '</td>';
          }else {
            bodyRows += '<td>' + "" + '</td>';
          }
        } else {
          if(row[colName]) {
            bodyRows += '<td>' + row[colName] + '</td>';
          } else {
            bodyRows += '<td>' + "" + '</td>';
          }
         
        }
      });
      bodyRows += '</tr>'
    })
    return '<table class="centerposition" align="center" id="table" border-collapse="collapse" border="1"><thead><tr>' +headerRows +'</tr></thead><tbody>' +bodyRows +'</tbody></table>';
}

const start = async () => {
  const moneyhub = await Moneyhub(config)
  const banks = await getBanks(moneyhub)
  const app = express()
  app.use(bodyParser.json());
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(bodyParser.urlencoded({ extended: true })); 
  app.use(cookieSession({
    name: 'session',
    keys: ['accessToken', 'caller'],
    maxAge: 10 * 60 * 60 * 1000 // 10 hours
  }));
  app.get("/keys", (req, res) => res.json(moneyhub.keys()))
  app.get("/spendingAnalysis", async (req, res) => {
    //const token = req.session.access_token
    const queryParams = {"offset":0,"limit":1000}
    const userId = "5e1706ae70f8250bc8b4a27a"
    const data = await moneyhub.getClientCredentialTokens({
      scope: DEFAULT_DATA_SCOPES_USE_CASE_2,
      sub: userId,
    })
    const bodyParams = {
      "dates": [
        {
          "name": "Over Last 3 months",
          "from": "2019-10-01",
          "to": "2020-01-09"
        },
         {
          "name": "Previous Three months",
          "from": "2019-07-01",
          "to": "2019-10-01"
        }
      ]
    }
    const token = data.access_token
    const spendingAnalysis = await moneyhub.spendingAnalysisWithToken(token,bodyParams)
    const categories = await moneyhub.getCategoriesWithToken(token)
    const categoryGrps = await moneyhub.getCategorygroupsWithToken(data.access_token)
      spendingAnalysis.data.categories.forEach(function(category) {
      const relatedCategory =  categories.data.filter(function(o){
       return (o.categoryId === category.categoryId)
       });
       if(relatedCategory[0]) {
          category.categoryName =capitalizeFirstLetter(relatedCategory[0].key)
       }
       const relatedCategoryGrp =  categoryGrps.data.filter(function(o){
        return (o.id === category.categoryGroup)
        });
        if(relatedCategoryGrp[0]) {
           category.categoryGroupName =capitalizeFirstLetter(relatedCategoryGrp[0].key)
        }
    });
    const headers = ['categoryName','categoryGroupName',bodyParams.dates[0].name,bodyParams.dates[1].name]

    const html = createHtmlfromJson(headers,spendingAnalysis.data.categories,'spendingAnalysis')
    res.send(`
    <html>
<head>
<style>
.centerposition {
  font-weight: bold;
  font-family: inherit;
  font-size: 20px;
  color: rgb(85, 109, 124);
}
.header {
  padding: 5px;
  margin: 0;
  text-align: center;
  background-color: SteelBlue;
  font-size: 20px;
  color: rgb(255, 255, 255)
}
</style>
</head>
<body>
      <div class="header">
      <h2>Welcome to Nationwide Building Society</h2>
      </div>  
<div class="centerposition">
<h3 align="center">Spending-Analysis </h3>
    ${html}
</div>
</body>
</html>
    `)
  })
  app.get("/transactions", async (req, res) => {
    const token = req.session.access_token
    const queryParams = {"offset":0,"limit":1000}
    const userId = "5e1706ae70f8250bc8b4a27a"
    const data = await moneyhub.getClientCredentialTokens({
      scope: DEFAULT_DATA_SCOPES_USE_CASE_2,
      sub: userId,
    })
    console.log(data.access_token,queryParams)
    const transactions = await moneyhub.getTransactionsWithToken(data.access_token,queryParams)
    allTransactions = []
    relatedCategorygrp = []
    const categoryGrps = await moneyhub.getCategorygroupsWithToken(data.access_token)
    const categories = await moneyhub.getCategoriesWithToken(data.access_token)
    const headers = ['accountId','category','categoryGroup','amount','currency','shortDescription','date']
    transactions.data.forEach(function(transaction) {
      const relatedCategory =  categories.data.filter(function(o){
       return (o.categoryId === transaction.categoryId)
       });
       if(relatedCategory[0]) {
            relatedCategorygrp =  categoryGrps.data.filter(function(o){
            return (relatedCategory[0].group === o.id)
          });
          transaction.category =capitalizeFirstLetter(relatedCategory[0].key)
          transaction.categoryGroup=capitalizeFirstLetter(relatedCategorygrp[0].key)
          allTransactions= allTransactions.concat(transaction)
       }
    });
    sortJsonArray(allTransactions, 'date');
    const html = createHtmlfromJson(headers,allTransactions,'transactions')
    res.send(`
    <html>
<head>
<style>
.centerposition {
  font-weight: bold;
  font-family: inherit;
  font-size: 20px;
  color: rgb(85, 109, 124);
}
.header {
  padding: 5px;
  margin: 0;
  text-align: center;
  background-color: SteelBlue;
  font-size: 20px;
  color: rgb(255, 255, 255)
}
</style>
</head>
<body>
      <div class="header">
      <h2>Welcome to Nationwide Building Society</h2>
      </div>  
<div class="centerposition">
<h3 align="center">Transactions </h3>
    ${html}
</div>
</body>
</html>
    `)
  })
  app.get("/accounts", async (req, res) => {
    const token = req.session.access_token
    const userId = "5e1706ae70f8250bc8b4a27a"
    const data = await moneyhub.getClientCredentialTokens({
      scope: DEFAULT_DATA_SCOPES_USE_CASE_2,
      sub: userId,
    })
    const accounts = await moneyhub.getAccounts(userId)
    const headers = ['accountName','currency','balance','balanceDate','providerName','accountType','type','transactionCount','lastTransactionDate']

    const html = createHtmlfromJson(headers,accounts.data,'accounts')
    res.send(`
    <html>
<head>
<style>
.centerposition {
  font-weight: bold;
  font-family: inherit;
  font-size: 20px;
  color: rgb(85, 109, 124);
}
.header {
  padding: 5px;
  margin: 0;
  text-align: center;
  background-color: SteelBlue;
  font-size: 20px;
  color: rgb(255, 255, 255)
}
</style>
</head>
<body>
      <div class="header">
      <h2>Welcome to Nationwide Building Society</h2>
      </div>  
<div class="centerposition">
<h3 align="center">Accounts</h3>
    ${html}
</div>
</body>
</html>
     `)
  })
  app.get("/income", async (req, res) => {
    const token = req.session.access_token
    const queryParams = {"offset":0,"limit":1000}
    const userId = "5e1706ae70f8250bc8b4a27a"
    const data = await moneyhub.getClientCredentialTokens({
      scope: DEFAULT_DATA_SCOPES_USE_CASE_2,
      sub: userId,
    })
    const categoryGrps = await moneyhub.getCategorygroupsWithToken(data.access_token)
    const categories = await moneyhub.getCategoriesWithToken(data.access_token)
    const transactions = await moneyhub.getTransactionsWithToken(data.access_token,queryParams)
    const incomeCategoryGrp = categoryGrps.data.filter(function(o){
      return (o.key === 'income');
    });
    incomeCategoriesArray = []
    incomeTransactionsArray = []
    incomeCategoryGrp.forEach(function(incomeGrp) {
      const incomeCategories =  categories.data.filter(function(o){
       return (o.group === incomeGrp.id)
      });
      incomeCategoriesArray= incomeCategoriesArray.concat(incomeCategories)
    });
    console.log(incomeCategoriesArray)
    incomeCategoriesArray.forEach(function(incomeCategory) {
      var incomeTransactions =  transactions.data.filter(function(o){
       return (o.categoryId === incomeCategory.categoryId)
       });
       if(incomeTransactions[0]){
        incomeTransactions.forEach(function(incomeTransaction){
          incomeTransaction.category =capitalizeFirstLetter(incomeCategory.key)
          incomeTransaction.categoryGroup=capitalizeFirstLetter('income')
          incomeTransactionsArray= incomeTransactionsArray.concat(incomeTransaction)
        })
       } 
    });
    sortJsonArray(incomeTransactionsArray, 'date');
    const headers = ['accountId','category','categoryGroup','amount','currency','longDescription','date']
    const html = createHtmlfromJson(headers,incomeTransactionsArray,'income')
    res.send(`
    <html>
<head>
<style>
.centerposition {
  font-weight: bold;
  font-family: inherit;
  font-size: 20px;
  color: rgb(85, 109, 124);
}
.header {
  padding: 5px;
  margin: 0;
  text-align: center;
  background-color: SteelBlue;
  font-size: 20px;
  color: rgb(255, 255, 255)
}
</style>
</head>
<body>
      <div class="header">
      <h2>Welcome to Nationwide Building Society</h2>
      </div>  
<div class="centerposition">
<h3 align="center">Income</h3>
    ${html}
</div>
</body>
</html>
    `)
  });
  app.get("/categories", async (req, res) => {
    const token = req.session.access_token
    const userId = "5e1706ae70f8250bc8b4a27a"
    const data = await moneyhub.getClientCredentialTokens({
      scope: DEFAULT_DATA_SCOPES_USE_CASE_2,
      sub: userId,
    })
    const categories = await moneyhub.getCategoriesWithToken(data.access_token)
    const categoryGrps = await moneyhub.getCategorygroupsWithToken(data.access_token)
    categories.data.forEach(function(category) {
      const relatedCatGrp =  categoryGrps.data.filter(function(o){
       return (o.id === category.group)
       });
       if(relatedCatGrp[0]) {
          category.categoryGroup =capitalizeFirstLetter(relatedCatGrp[0].key)
       }
    });
    const headers = ['category','categoryGroup','categoryId']
    const html = createHtmlfromJson(headers,categories.data,'category')
    res.send(`
    <html>
<head>
<style>
.centerposition {
  font-weight: bold;
  font-family: inherit;
  font-size: 20px;
  color: rgb(85, 109, 124);
}
.header {
  padding: 5px;
  margin: 0;
  text-align: center;
  background-color: SteelBlue;
  font-size: 20px;
  color: rgb(255, 255, 255)
}
</style>
</head>
<body>
      <div class="header">
      <h2>Welcome to Nationwide Building Society</h2>
      </div>  
<div class="centerposition">
<h3 align="center">Categories</h3>
    ${html}
</div>
</body>
</html>
    `)
  })
  app.post("/consent", async (req, res) => {
    console.log(req.body)
    if(req.body.radgroup=='Yes') {
      res.redirect('/data')
    }
    else {
      res.send(`
      <html>
      <head>
      <style>
      .centerposition {
        margin-top: 150px;
        margin-bottom: 350px;
        margin-right: 400px;
        margin-left: 400px;
        padding: 10px;
        background: linear-gradient(to bottom, white, SteelBlue);  
        font-weight: bold;
        font-family: inherit;
        font-size: 20px;
        color: rgb(85, 109, 124);
      }
      .header {
        padding: 5px;
        margin: 0;
        text-align: center;
        background-color: SteelBlue;
        font-size: 20px;
        color: rgb(255, 255, 255)
      }
      }
      </style>
      </head>
      <body>
      <div class="header">
      <h2>Welcome to Nationwide Building Society</h2>
      </div>
      <div class="centerposition">
    <p align="center">Nationwide needs your financial documents  to proceed.</p>
    <p align="center">You would need to upload them manually</p> 
    </div>
    </body>
    </html>  
      `)
    }
    
  })
  app.get("/", (req, res) => {
    if(!req.session.access_token) {
    res.send(`
    <html>
    <head>
    <style>
    .textstyle {
      color: rgb(85, 109, 124);
      font-size: 30px;
      font-weight: bold;
      font-family: inherit;
    }
    .centerposition {
      margin-top: 150px;
      margin-bottom: 350px;
      margin-right: 400px;
      margin-left: 400px;
      padding: 10px;
      background: linear-gradient(to bottom, white, SteelBlue);  
      font-weight: bold;
      font-family: inherit;
      font-size: 20px;
      color: rgb(85, 109, 124);
    }
    .header {
      padding: 5px;
      margin: 0;
      text-align: center;
      background-color: SteelBlue;
      font-size: 20px;
      color: rgb(255, 255, 255)
    }
    .block {
      padding: 10px;
      border-radius: 4px;
      border: none;
      background: rgb(85, 109, 124);
      color: rgb(255, 255, 255);
      width: 20%;
      text-transform: uppercase;
      font-weight: bold;
      font-family: inherit;
      cursor: pointer;
      font-size: 16px;
      letter-spacing: 0;
    }
    </style>
    </head>
    <body>
    <div class="header">
    <h2>Welcome to Nationwide Building Society</h2>
    </div>
    <div class="centerposition">
 
  <p align="center">Nationwide needs your financial documents  to proceed.</p>
  <p align="center" >Would you like us yo get your income details from your bank  </p>
  <form id="myForm" align="center" method="POST" action="/consent">
  <label class="block"><input type="radio" name="radgroup" value="Yes" onclick=document.getElementById('myForm').submit();>Yes</label>
  <label class="block"><input type="radio" name="radgroup" value="No" onclick=document.getElementById('myForm').submit();>No</label>
  </form>
  </div>
 

  </body>
  </html>
  `)}
  else {
    res.send(`
    <html>
    <head>
    <style>
    .textstyle {
      color: rgb(85, 109, 124);
      font-size: 30px;
      font-weight: bold;
      font-family: inherit;
    }
    .centerposition {
      margin-top: 80px;
      margin-bottom: 400px;
      margin-right: 400px;
      margin-left: 400px;
      background: linear-gradient(to bottom, white, SteelBlue);  
      font-weight: bold;
      font-family: inherit;
      font-size: 20px;
      color: rgb(85, 109, 124);
    }
    .header {
      padding: 5px;
      margin: 0;
      text-align: center;
      background-color: SteelBlue;
      font-size: 20px;
      color: rgb(255, 255, 255)
    }
    </style>
    </head>
    <body>
    <div class="header">
    <h2 align="center">Welcome to Nationwide Building Society</h2>
    </div>
    <p align="center" class="textstyle">Successfully connected to your bank</p>
    <div align="center" class="centerposition">
    <p> Get Transactions Data: <a href="/transactions">Transactions</a></p><br />
    <p> Get Income Data: <a href="/income">Income</a></p><br />
    <p> Spending Analysis Data: <a href="/spendingAnalysis">Spending-Analysis</a></p><br />
    <p> Get Accounts Data: <a href="/accounts">Accounts</a></p><br />
    <p> Get Categories Data: <a href="/categories">Categories</a></p><br />
    </div>
   </body>
   </html>
    `)
  }
  });
  app.get("/base.css", (req, res) => {
    res.sendFile('/Users/nitgoel0/Documents/moneyhub/moneyhub-api-client/examples/payments/base.css');
  })
  app.get("/data", (req, res) => {
    if(!req.session.access_token) {
    res.send(`
    <html>
    <head>
    <style>
    .content {
      margin-top: 300px;
      margin-bottom: 400px;
      margin-right: 150px;
      margin-left: 80px;
      }
    .banklist {
      font-size: 16px;
      font-weight: bold;
      font-family: inherit;
    }
    .textstyle {
      color: rgb(85, 109, 124);
    }
    .centerposition {
      margin-top: 150px;
      margin-bottom: 350px;
      margin-right: 400px;
      margin-left: 400px;
      padding: 10px;
      background: linear-gradient(to bottom, white, SteelBlue);  
      font-weight: bold;
      font-family: inherit;
      font-size: 20px;
      color: rgb(85, 109, 124);
    }
    .button {
      padding: 16px;
      margin: 4px 0;
      border-radius: 4px;
      border: none;
      background: rgb(85, 109, 124);
      color: rgb(255, 255, 255);
      width: 20%;
      text-transform: uppercase;
      font-weight: bold;
      font-family: inherit;
      cursor: pointer;
      font-size: 16px;
      letter-spacing: 0;
    }
    .header {
      padding: 5px;
      margin: 0;
      text-align: center;
      background-color: SteelBlue;
      font-size: 20px;
      color: rgb(255, 255, 255)
    }
    .bodystyle {
      margin: 0;
      font-weight: bold;
      font-family: inherit;
      font-size: 20px;
      color: rgb(27, 27, 27);
    }
    </style>
    </head>
    <body>
    <div class="header">
    <h2 align="center">Welcome to Nationwide Building Society</h2>
    </div>
    <div class="centerposition">
  <h3 align="center" class="textstyle">Here is list of providers Nationwide connects to </h4>
  <form  align="center" id="form2" action="/bankprovider" method="POST">
  <select class="banklist" id="sel" name="providerId">
  ${banks
    .map(({id, name}) => `<option value=${id}>${name}</option>`)}
  </select>
  </br>
  </br>
  </br>
  <button class="button" name="subject" type="submit">Get Details</button>
  </form>
  </div>
  </body>
  </html>
  `)} else {
    res.send(`<html>
    <head>
    <style>
    .textstyle {
      color: rgb(85, 109, 124);
      font-size: 30px;
      font-weight: bold;
      font-family: inherit;
    }
    .centerposition {
      margin-top: 80px;
      margin-bottom: 400px;
      margin-right: 400px;
      margin-left: 400px;
      background: linear-gradient(to bottom, white, SteelBlue);  
      font-weight: bold;
      font-family: inherit;
      font-size: 20px;
      color: rgb(85, 109, 124);
    }
    .header {
      padding: 5px;
      margin: 0;
      text-align: center;
      background-color: SteelBlue;
      font-size: 20px;
      color: rgb(255, 255, 255)
    }
    </style>
    </head>
    <body>
    <div class="header">
    <h2 align="center">Welcome to Nationwide Building Society</h2>
    </div>
    <p align="center" class="textstyle">Successfully connected to your bank</p>
    <div align="center" class="centerposition">
    <p> Get Transactions Data: <a href="/transactions">Transactions</a></p><br />
    <p> Get Income Data: <a href="/income">Income</a></p><br />
    <p> Spending Analysis Data: <a href="/spendingAnalysis">Spending-Analysis</a></p><br />
    <p> Get Accounts Data: <a href="/accounts">Accounts</a></p><br />
    <p> Get Categories Data: <a href="/categories">Categories</a></p><br />
    </div>
   </body>
   </html>`)
  }
  })

  app.post("/bankprovider", async (req, res) => {
    const id = req.body.providerId
    const url = await moneyhub.getAuthorizeUrl({
      state: DEFAULT_STATE,
      scope: `openid offline_access id:${id} accounts:read transactions:read:all categories:read`,
    })
    res.redirect(url)
  })

  app.get("/auth/callback", async (req, res) => {
    const queryParams = req.query
    console.log("Query params", JSON.stringify(queryParams, null, 2))
    if (queryParams.error) {
      return res.json(queryParams)
    }
    const tokens = await moneyhub.exchangeCodeForTokens({
      ...queryParams
    })
    console.log(tokens)
    req.session.access_token=tokens.access_token
    res.redirect("/")
  })

  app.listen(3001, () => console.log("Test Server started on port 3001"))
}

start()
