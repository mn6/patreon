require('dotenv').config()

const express = require('express')
const app = express()
const port = 9786

const redis = require("redis")
const client = redis.createClient()
const { promisify } = require("util")
const get = promisify(client.get).bind(client)
const set = promisify(client.set).bind(client)

const patreon = require('patreon')
const patreonAPI = patreon.patreon
const patreonAPIClient = patreonAPI(process.env.ACCESS_TOKEN)

const savePatreons = () => {
  patreonAPIClient(`/campaigns/${process.env.CAMPAIGN_ID}/pledges?include=patron.null`)
  .then(({ store }) => {
    const pledges = store.findAll('pledge')
    let save = {
      gold: [],
      silver: [],
      bronze: []
    }
    for (let i of pledges) {
      const firstName = i.patron.first_name
      const tier = i.pledge_cap_cents === 100 ? 'bronze' : i.pledge_cap_cents === 300 ? 'silver' : 'gold'
      save[tier].push(firstName)
    }

    set('nook:pledges', JSON.stringify(save))
    console.log(new Date() + ' | Saved pledges.')
  })
  .catch(err => {
    console.error('error!', err)
    response.end(err)
  })
}

// Cache patreon list every 5 mins
setInterval(function () {
  savePatreons()
}, 60000 * 5)
savePatreons()

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/getPatrons', function(req, res, next) {
  get('nook:pledges').then((r) => {
    res.json(JSON.parse(r))
  })
});

app.listen(port, () => console.log(`Patreon API listening at http://localhost:${port}`))
