const CandleArray = require('./candleArray');
const Order = require('./order')
const assert = require('assert');

class BotTrader {
  constructor(exchange, numCandles, candleInterval, candleDB, tradesDB, lower, upper) {
    this.timeInitialized = Date.now();
    this.tradesDB = tradesDB;
    this.candles = new CandleArray(numCandles, candleInterval, candleDB);
    this.outstandingOrders = [];
    this.exchange = exchange;
    exchange.bot = this;

    this.isTimeToBuy = false;
  }

  processTrade(trade){
    let td = {
      time: trade[2][1],
      amount: trade[2][2],
      price: trade[2][3]
    };
    console.log("[trade]",td);
    this.candles.add(td);
    this.tradesDB.insertOne(td, (err, data) => assert.equal(err, null));
  }

  makeDecision() {
    console.log("[botTrader] making trade decision...");
    if (this.candles.size*this.candles.interval*1000 <
        Date.now() - this.timeInitialized) {
      console.log("[botTrader] not enough data to make a decision")
      return false
    }
    let nextOrder = this.produceNextOrder();
    if (nextOrder) {
      this.outstandingOrders.push(nextOrder);
      this.exchange.placeOrder(nextOrder);
    } else {
      console.log("[botTrader] no order necessary");
    }
  }

  makeDecisionsRegularly(bot, timePeriod) {
    setInterval(this.makeDecision.bind(this), timePeriod*1000);
	}

  produceNextOrder() {}

  get lastOrder() {
    return this.outstandingOrders[this.outstandingOrders.length-1]
  }
}

module.exports = BotTrader;
