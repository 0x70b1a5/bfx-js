const Order = require('./order')
const BotTrader = require ('./bot')

class SimpleArbitrageBot extends BotTrader {
  constructor(exchange, numCandles, candleInterval, candleDB, tradesDB, lower, upper) {
    super(exchange, numCandles, candleInterval, candleDB, tradesDB);
    this.lowerMargin = lower;
    this.upperMargin = upper;

    this.makeDecisionsRegularly(60)
  }

  produceNextOrder() {
    if (this.outstandingOrders.length > 0 ||
        !this.candles.lastCandle) return null;
    let price, amount, side,
      lastMA = this.candles.lastCandle.ma10,
      order;
    if (isTimeToBuy) {
      price = lastMA*(1-lowerMargin);
      amount = this.exchange.balances.USD/price /10; // only trade 0.1th for now
      side = "buy"
    } else {
      price = this.lastOrder.price*(1+upperMargin);
      amount = -1*this.exchange.balances.BTC; // -1 = sell
      side = "sell"
    }
    order = new Order(price, amount, side);
    console.log("New order: ", JSON.stringify(order));
    isTimeToBuy = !isTimeToBuy;
    return order;
  }
}

module.exports = SimpleArbitrageBot;
