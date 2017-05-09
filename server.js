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
parser.addArgument(
  [ '-b', '--bands' ],
  {
    help: 'number of candles to use for bollinger banding',
    defaultValue: '20',
    action: 'store'
  }
)
var args = parser.parseArgs()
if (args.help) {
  parser.printHelp()
  return
}

const SimpleArbitrageBot = require('./simpleArbBot')
const FiniteStateBot = require('./finiteStateBot')
const BollingerBot = require('./bollingerBot')
const CandleArray = require('./candleArray')
const Exchange = require('./exchange')
const Auth = new (require('./auth'))()
const Order = require('./order')

console.log("[websocket] initializing...");
const w = new websocket('wss://api.bitfinex.com/ws/2')
console.log("- [rest] authorizing...");
const BFX = new Exchange(w, Auth.rest, args.testmode);

w.onmessage = msg => {
  handle(JSON.parse(msg.data))
}

w.onopen = () => {
  console.log("[websocket] connected. authorizing...");
  w.send(JS(Auth.ws))
  console.log("[websocket] subscribing to channels...");
  w.send(JS({
    event: 'subscribe',
    channel: 'trades',
    symbol: 'tBTCUSD'
  }))
  BFX.updateBalances()
  console.log("- [websocket] monitoring trades...");
}

var DB, Trades, Orders, Candles, Bands, BOT;
MongoClient.connect("mongodb://localhost:27017/bfx", (err,db) => {
  assert.equal(err, null)
  DB = db;
  Trades = db.collection('trades');
  Orders = db.collection('orders');
  Candles = db.collection('candles');
  Bands = db.collection('bands');
  console.log("[db] connected to mongodb");
  if (!args.preserve) {
    Trades.deleteMany({});
    Orders.deleteMany({});
    Candles.deleteMany({});
    Bands.deleteMany({});
    console.log("- [db] cleared old entries");
  } else console.log("- [db] preserving old data");
  // TODO look up old data in the database and
  // construct candles therefrom
  BOT = new BollingerBot(BFX, 30, 60, Candles, Trades, Bands, args.preserve, Number(args.bands));
  console.log("- [botTrader] setup complete");

  // finally, start bot
  BOT.makeDecisionsRegularly(120);
})


var handle = data => {
  if (data[1] == 'te') {
    BOT.processTrade(data);
    return
  } else if (data[1] == "hb" || data[1] == 'tu') { // heartbeat or tradeupdate
    return
  } else if (data[0] === 0) {
    if (data[1] == 'os') {
      BFX.initializeOrders(data[2]);
    } else if (data[1] == 'on') {
      let o = data[2],
        order = new Order(o[0], o[16], o[6], (o[6] > 0 ? "buy" : "sell"))
      console.log(`- [websocket] ${order.side} order confirmed: ${JS(order)}`);
      BFX.orders.push(order)
    } else if (data[1] == 'oc') {
      console.log(`$ [websocket] order #${data[2][0]} closed`);
      BFX.removeOrder(data[2][0])
      BFX.updateBalances()
    } else if (data[1] == 'n') {
      console.log("! [websocket]", data)
    }
    return
  } else if (data.event == "subscribed") {
    console.log("- [websocket] subscribed to", data.channel);
  } else if (data.event == "auth") {
    console.log("- [websocket] authorized");
  }
}

//TODO browser page for tweaking inputs and displaying data
// var app = (require('express'))();
// app.get('/', (req, res) => {
//
// })
// app.listen(8080);
