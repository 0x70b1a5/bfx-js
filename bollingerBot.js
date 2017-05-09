const Order = require('./order')
const BotTrader = require ('./bot')
const assert = require('assert')

class BollingerBot extends BotTrader {
  constructor(exchange, numCandles, candleInterval, candleDB, tradesDB, bandsDB, fromDb, bands) {
    super(exchange, numCandles, candleInterval, candleDB, tradesDB, fromDb);
    this.bandsDB = bandsDB;
    this.numBands = bands;
    this.bands = [];
    console.log(`- [bollingerBot] initialized with ${bands} bands`);
    this.ORDER_AMOUNT = 0.1;
  }

  getBand(n, k) {
    let len = this.candles.length;
    if (len < n+1) { // skip lastCandle, its ema is a duplicate
      console.log(`- [bollingerBot] too few candles to band (${len-1}/${n})`);
      return null;
    }
    // determine mean and sd of MAs
    let mean = 0;
    for (let i=len-n-1; i<len-1; i++){
      mean += this.candles[i].ema
    }
    mean /= n;
    let sd = 0;
    for (let i=len-n-1; i<len-1; i++) {
      sd += Math.pow(this.candles[i].ema-mean, 2)
    }
    sd = Math.sqrt(sd/n);
    let band = {
        date: this.secondLastCandle.openTime,
        ema: mean,
        low: mean - k*sd,
        high: mean + k*sd
    };
    this.bands.push(band);
    this.bandsDB.insertOne(band, (err, res) => assert.equal(err, null));
    console.log(`- [bollingerBot] newest band: ${JSON.stringify(band)}`);
    return band;
  }

  produceNextOrder() {
    let newBand = this.getBand(this.numBands, 2);
    if (!newBand) return null;
    // return null;
    console.log('O [bollingerBot] producing order...');
    let order, price, amount, side,
      buyOrSell = this.isTimeToBuy();
    if (buyOrSell !== null) {
      if (buyOrSell) {
        price = Math.min(this.lastBand.low, this.lastCandle.close);
        amount = this.ORDER_AMOUNT;
        side = "buy"
      } else {
        price = Math.max(this.lastBand.high, this.lastCandle.close);
        amount = -this.ORDER_AMOUNT
        side = "sell"
      }
      order = new Order(Date.now()*10+14, price, amount, side, "EXCHANGE LIMIT");
      console.log("O [bollingerBot] created order: ", JSON.stringify(order));
      return order
    }
    return null;
  }

  isTimeToBuy() {
    // return true -> buy order
    // return false -> sell order
    // return null -> no order
    this.exchange.updateBalances();
    if (this.lastCandle !== null &&
          this.exchange.balances.USD < this.lastCandle.close*this.ORDER_AMOUNT) {
      console.log("X [bollingerBot] not enough USD to buy");
      // TODO revisit whether this is necessary
      return false
    }
    if (this.exchange.balances.BTC < this.ORDER_AMOUNT) {
      console.log("X [bollingerBot] not enough BTC to sell");
      // TODO revisit whether this is necessary
      return true
    }
    if (this.lastBand && this.lastCandle.high > this.lastBand.high) {
      console.log("O [bollingerBot] price higher than 2sd. selling...");
      return false
    }
    if (this.lastBand && this.lastCandle.low < this.lastBand.low) {
      console.log("O [bollingerBot] price lower than 2sd. buying...");
      return true
    }
    console.log("- [bollingerBot] no order conditions met.");
    return null
  }

  get lastOrder() {
    return this.exchange.lastOrder
  }

  get lastBand() {
    return this.bands.length > 0 ? this.bands[this.bands.length-1] : null
  }
}

module.exports = BollingerBot;
