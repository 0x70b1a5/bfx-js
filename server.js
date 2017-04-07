'use strict';
console.log("importing libraries");
const websocket = require('ws')
const crypto = require('crypto-js')
const JS = JSON.stringify
const MongoClient = require('mongodb').MongoClient
const assert = require('assert')
var ArgumentParser = require('argparse').ArgumentParser;

var parser = new ArgumentParser({
  version: '0x000000',
  addHelp: true,
  description: 'a mid-frequency cryptocurrency trader'
})
parser.addArgument(
 [ '-p', '--preserve' ],
 {
   help: 'preserve database trades, orders, and candles',
   action: "storeTrue"
 }
)
var args = parser.parseArgs()

const BotTrader = require('./bot')
const CandleArray = require('./candleArray')
const Exchange = require('./exchange')

const apiKey = process.env.BFX_API_KEY
const apiSecret = process.env.BFX_API_SECRET
const w = new websocket('wss://api.bitfinex.com/ws/2')
const BFX = new Exchange(w);

const authNonce = Date.now() * 1000
const authPayload = 'AUTH' + authNonce
const authSig = crypto
.HmacSHA384(authPayload, apiSecret)
.toString(crypto.enc.Hex)

const authEvent = {
  apiKey,
  authSig,
  authNonce,
  authPayload,
  event: 'auth',
  filter: [
    'trading',
    'balance'
  ]
}

w.onmessage = msg => {
  handle(JSON.parse(msg.data))
}

w.onopen = () => {
  console.log("websocket connected. authorizing...");
  w.send(JS(authEvent))
  console.log("auth complete. subscribing to channels...");
  w.send(JS({
    event: 'subscribe',
    channel: 'ticker',
    symbol: 'tBTCUSD'
  }))
  w.send(JS({
    event: 'subscribe',
    channel: 'trades',
    symbol: 'tBTCUSD'
  }))
  console.log("monitoring trades...");
}

var DB, Trades, Orders, Candles, BOT;
MongoClient.connect("mongodb://localhost:27017/bfx", (err,db) => {
  assert.equal(err, null)
  DB = db;
  Trades = db.collection('trades');
  Orders = db.collection('orders');
  Candles = db.collection('candles');
  console.log("connected to mdb");
  if (!args.preserve) {
    Trades.deleteMany({});
    Orders.deleteMany({});
    Candles.deleteMany({});
    console.log("cleared old db");
  } else console.log("using old db data");
  BOT = new BotTrader(BFX, 30, 60, Candles, Trades)
  console.log("bot setup complete");
})

var channels = {
  ticker: 0,
  trades: 0,
  auth: 0
}

var handle = data => {
  if (data[0] == channels.trades && data[1] == 'te') {
    BOT.processTrade(data);
  } else if (data[0] == channels.auth) {
    // console.log("auth",JSON.stringify(data));
    if (data[1] == 'bu') {
      data[2][3] ? BFX.updateBalance(data[2][3], data[2][1])
        : BFX.updateBalance("USD", data[2][1])
    } else if (data[1] == 'os') {
      BFX.initializeOrders(data[2]);
    }
  } else if (data[0] == channels.ticker) {
    // console.log("ticker",JSON.stringify(data));
    return
  }
  if (data.event == "subscribed" || data.event == "auth") {
    // must fix if trading on multiple currencies...
    if (data.channel == "ticker") channels.ticker = data.chanId;
    if (data.channel == "trades") channels.trades = data.chanId;
    if (data.event == "auth") channels.auth = data.chanId;
    return;
  }
  if (data[1] == "hb") return; // empty heartbeat
}
