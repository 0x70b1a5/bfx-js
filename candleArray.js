const Candle = require('./candle')
const assert = require('assert')

class CandleArray {
  constructor(maxNumber, secondsInterval, DB) {
    this.maxCandles = maxNumber;
    this.secondsInterval = secondsInterval;
    this.candles = [];
    this.DB = DB;
  }

  add(trade) {
    // is it time to create a new candle?
    // if empty, or if timeInterval elapsed: yes
    // write our most recent candle to DB,
    // and calculate moving averages
		if (this.candles.length === 0 ||
          trade.time-this.lastCandle.openTime > this.secondsInterval*1000) {
      if (this.candles.length>0) {
        this.lastCandle.ma10 = this.movingAvg(10, this.lastCandle.average);
        this.lastCandle.ma21 = this.movingAvg(21, this.lastCandle.average);
        this.lastCandle.ema = this.expMovingAvg
  			console.log('- [candleArray] writing lastCandle to DB...');
        this.DB.insertOne(this.lastCandle, err => assert.equal(err, null))
      }
      console.log(`- [candleArray] creating new candle...`)
      let newCandle;
      if (this.lastCandle) {
        newCandle = new Candle(
          this.lastCandle.ma10,
          this.lastCandle.ma21,
          this.lastCandle.ema
        )
      } else {
        newCandle = new Candle();
      }
			newCandle.add(trade);
			this.candles.push(newCandle);
      if (this.candles.length > this.maxCandles) {
        console.log(`- [candleArray] removing oldest candle...`);
        this.candles.shift();
      }
		} else this.lastCandle.add(trade);
  }

  movingAvg(prev_candles, fallback) {
    let ma = 0,
      total = 0,
      len = this.candles.length,
      n = prev_candles;

    if (n > len) n = len;
    for (let i=len-n; i<len; i++){
      ma += this.candles[i].amtxpri;
      total += this.candles[i].volume;
    }
    if (total > 0) return ma/total;
    return fallback
  }

  get expMovingAvg() {
		// https://en.wikipedia.org/wiki/Moving_average#Exponential_moving_average
    let last_ema = 0,
      a = 0.75, // TODO this is a MAGIC NUMBer. (alpha weight.) REMOVE
      sma = this.movingAvg(10, this.lastCandle.average);
    if (this.candles.length == 1) {
      return sma
    }
    last_ema = this.secondLastCandle.ema;
    return a*sma+(1-a)*last_ema
  }

  get length() {
    return this.candles.length
  }

  get lastCandle() {
    return this.candles.length > 0 ? this.candles[this.candles.length-1] : null
  }

  get secondLastCandle() {
    return this.candles.length > 1 ? this.candles[this.candles.length-2] : null
  }

  get firstCandle() {
    return this.candles.length > 0 ? this.candles[0] : null
  }

  get interval() {
    return this.secondsInterval
  }
}

module.exports = CandleArray;
