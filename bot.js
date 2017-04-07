const CandleArray = require('./candleArray');
const Order = require('./order')
const assert = require('assert');

class BotTrader {
  constructor(exchange, numCandles, candleInterval, candleDB, tradesDB, lower, upper) {
    this.tradesDB = tradesDB;
    this.candles = new CandleArray(numCandles, candleInterval, candleDB);
    this.outstandingOrders = [];
    this.exchange = exchange;
    exchange.bot = this;

    this.lowerMargin = lower;
    this.upperMargin = upper;

    this.isTimeToBuy = false;
  }

  processTrade(trade){
    let td = {
      time: trade[2][1],
      amount: trade[2][2],
      price: trade[2][3]
    };
    console.log("bot witnessed trade:",td);
    this.candles.add(td);
    this.tradesDB.insertOne(td, (err, data) => assert.equal(err, null));
  }

  makeDecision() {
    console.log("botTrader making trade decision...");
    let nextOrder = this.produceNextOrder();
    if (nextOrder) {
      this.outstandingOrders.push(nextOrder);
      this.exchange.placeOrder(nextOrder);
    }
  }

  makeDecisionsRegularly(timePeriod) {
    var that = this;
    setInterval(that.makeDecision, timePeriod);
	}

  produceNextOrder() {
    if (this.outstandingOrders.length > 0) return null;
    let price, amount, 
      lastMA = this.candles.lastCandle.ma10,
      order;
    if (isTimeToBuy) {
      price = lastMA*(1-lowerMargin);
      amount = this.exchange.balances.USD/price /10; // only trade 0.1th for now
    } else {
      price = this.lastOrder.price*(1+upperMargin);
      amount = -1*this.exchange.balances.BTC; // -1 = sell
    }
    order = new Order(price, amount);
    console.log("New order: ", JSON.stringify(order));
    isTimeToBuy = !isTimeToBuy;
    return order;
  }

  get lastOrder() {
    return this.outstandingOrders[this.outstandingOrders.length-1]
  }
}

module.exports = BotTrader;
