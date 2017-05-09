const CandleArray = require('./candleArray');
const Order = require('./order')
const assert = require('assert');

class BotTrader {
  constructor(exchange, numCandles, candleInterval, candleDB, tradesDB, fromDb) {
    this.timeInitialized = Date.now();
    this.tradesDB = tradesDB;
    this.candleArray = new CandleArray(numCandles, candleInterval, candleDB);
    // if (!!fromDb) this.initializeCandles();
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
    console.log("> [trade]",trade);
    if (isNaN(td.time)) return;
    this.candleArray.add(td);
    this.tradesDB.insertOne(td, (err, data) => assert.equal(err, null));
  }

  makeDecision() {
    console.log("O [botTrader] making order decision...");
    let nextOrder = this.produceNextOrder();
    if (nextOrder) {
      this.orders.push(nextOrder);
      this.exchange.placeOrder(nextOrder);
    } else {
      console.log("- [botTrader] no order necessary");
    }
  }

  makeDecisionsRegularly(timePeriod) {
    setInterval(this.makeDecision.bind(this), timePeriod*1000);
	}

  // initializeCandles() {
  //   this.candleDB.find().sort()
  // }

  produceNextOrder() {}

  get lastOrder() {
    return this.orders[this.orders.length-1]
  }

  get candles() {
    return this.candleArray.candles
  }

  get lastCandle() {
    return this.candleArray.lastCandle
  }

  get secondLastCandle() {
    return this.candleArray.secondLastCandle
  }
}

module.exports = BotTrader;
