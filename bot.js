const CandleArray = require('./candleArray');
const Order = require('./order')
const assert = require('assert');

class BotTrader {
  constructor(exchange, numCandles, candleInterval, candleDB, tradesDB, lower, upper) {
    this.timeInitialized = Date.now();
    this.tradesDB = tradesDB;
    this.candles = new CandleArray(numCandles, candleInterval, candleDB);
    this.orders = [];
    this.exchange = exchange;
    exchange.bot = this;
  }

  processTrade(trade){
    let td = {
      time: trade[2][1],
      amount: trade[2][2],
      price: trade[2][3]
    };
    console.log("> [trade]",td);
    this.candles.add(td);
    this.tradesDB.insertOne(td, (err, data) => assert.equal(err, null));
  }

  makeDecision() {
    console.log("[botTrader] making trade decision...");
    let nextOrder = this.produceNextOrder();
    if (nextOrder) {
      this.orders.push(nextOrder);
      this.exchange.placeOrder(nextOrder);
    } else {
      console.log("[botTrader] no order necessary");
    }
  }

  makeDecisionsRegularly(timePeriod) {
    setInterval(this.makeDecision.bind(this), timePeriod*1000);
	}

  produceNextOrder() {}

  get lastOrder() {
    return this.orders[this.orders.length-1]
  }
}

module.exports = BotTrader;
