'use strict';
console.log("importing libraries")
const websocket = require('ws')
const request = require('request')
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
parser.addArgument(
 [ '-t', '--testmode' ],
 {
   help: 'print orders to STDOUT instead of placing them',
   action: "storeTrue"
 }
)
var args = parser.parseArgs()
if (args.help) {
  parser.printHelp()
  return
}

const SimpleArbitrageBot = require('./simpleArbBot')
const FiniteStateBot = require('./finiteStateBot')
const CandleArray = require('./candleArray')
const Exchange = require('./exchange')
const Auth = new (require('./auth'))()

console.log("[websocket] initializing...");
const w = new websocket('wss://api.bitfinex.com/ws/2')
console.log("[rest] authorizing...");
Auth.rest('/account_infos',
  {
    'request': '/v1/account_infos',
    'nonce': (Date.now()*1000).toString()
  },
  (error, response, body) => assert.equal(error, null))
const BFX = new Exchange(w, Auth.rest, args.testmode);

// console.log("making REST auth request...");

w.onmessage = msg => {
  handle(JSON.parse(msg.data))
}

w.onopen = () => {
  console.log("[websocket] connected. authorizing...");
  w.send(JS(Auth.ws))
  console.log("[websocket] subscribing to channels...");
  // w.send(JS({
  //   event: 'subscribe',
  //   channel: 'ticker',
  //   symbol: 'tBTCUSD'
  // }))
  w.send(JS({
    event: 'subscribe',
    channel: 'trades',
    symbol: 'tBTCUSD'
  }))
  // w.send(JS({
  //   event: 'subscribe',
  //   channel: 'trades',
  //   symbol: 'tETHUSD'
  // }))
  console.log("[websocket] monitoring trades...");
}

var DB, Trades, Orders, Candles, BOT;
MongoClient.connect("mongodb://localhost:27017/bfx", (err,db) => {
  assert.equal(err, null)
  DB = db;
  Trades = db.collection('trades');
  Orders = db.collection('orders');
  Candles = db.collection('candles');
  console.log("[db] connected to mongodb");
  if (!args.preserve) {
    Trades.deleteMany({});
    Orders.deleteMany({});
    Candles.deleteMany({});
    console.log("[db] cleared old entries");
  } else console.log("[db] preserving old data");
  BOT = new FiniteStateBot(BFX, 30, 60, Candles, Trades, 0.01, 0.01, 0.1, 1)
  console.log("[botTrader] setup complete");
  BOT.makeDecisionsRegularly(BOT, 60);
})


var handle = data => {
  if (data[1] == 'te') {
    BOT.processTrade(data);
    return
  } else if (data[1] == "hb") { // empty heartbeat
    return
  } else if (data[0] === 0) {
    if (data[1] == 'bu') {
      data[2][3] ? BFX.updateBalance(data[2][3], data[2][1])
        : BFX.updateBalance("USD", data[2][1])
    } else if (data[1] == 'os') {
      BFX.initializeOrders(data[2]);
    } else if (data[1] == 'oc') {
      console.log("[websocket] order", data, "closed");
      BFX.removeOrder(data[2][0])
    }
    return
  } else if (data.event == "subscribed") {
    console.log("[websocket] subscribed to", data.channel);
  } else if (data.event == "auth") {
    console.log("[websocket] authorized");
  }
}
