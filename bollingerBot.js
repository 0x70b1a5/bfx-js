const Order = require('./order')
const BotTrader = require ('./bot')
const assert = require('assert')

class BollingerBot extends BotTrader {
  constructor(exchange, numCandles, candleInterval, candleDB, tradesDB, bandsDB, fromDb, bands) {
    super(exchange, numCandles, candleInterval, candleDB, tradesDB, fromDb);
    this.bandsDB = bandsDB;
    this.numBands = bands;
    this.bands = [];
    console.log(`[bollingerBot] initialized with ${bands} bands`);
  }

  getBand(n, k) {
    let len = this.candles.length;
    if (len < n+1) { // skip lastCandle, it has no ema yet
      console.log(`[bollingerBot] too few candles to band (${len-1}/${n})`);
      return null;
    }
    // determine mean and sd of MAs
    let mean = 0;
    for (var i=len-n-1; i<len-1; i++){
      mean += this.candles[i].ema
    }
    mean /= n;
    let sd = 0;
    for (var i=len-n-1; i<len-1; i++) {
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
    console.log(`[bollingerBot] newest band: ${JSON.stringify(band)}`);
    return band;
  }

  produceNextOrder() {
    let newBand = this.getBand(this.numBands, 2);
    if (!newBand) return null;
    return null; // temp
    console.log('[bollingerBot] producing order...');
    let order, price, amount, side;
    if (this.isTimeToBuy()) {
      price = Math.min(this.lastBand.low, this.lastCandle.close);
      amount = 0.02*this.lastCandle.close;
      side = "buy"
    } else {
      price = Math.max(this.lastBand.high, this.lastCandle.close);
      amount = -0.02
      side = "sell"
    }
    order = new Order(Date.now()*10+14, price, amount, side, "MARKET");
    console.log("[finiteStateBot] created order: ", JSON.stringify(order));
    return order
  }

  isTimeToBuy() {
    if (this.candles.length < this.numBands) return false;
    if (this.secondLastCandle !== null &&
          this.exchange.balances.USD < this.secondLastCandle.close*0.01) {
      console.log("[bollingerBot] not enough USD to buy");
      return false
    }
    // if (this.exchange.balances.BTC < 0.02) {
    //   console.log("[bollingerBot] not enough BTC to sell");
    //   return true
    // }
    if (this.lastBand && this.secondLastCandle.high > this.lastBand.high) {
      console.log("[bollingerBot] price higher than 2sd. selling...");
      return false
    }
    return true
  }

  get lastOrder() {
    return this.exchange.lastOrder
  }

  get lastBand() {
    if (this.bands.length === 0) return null;
    return this.bands[this.bands.length-1]
  }
}

module.exports = BollingerBot;
