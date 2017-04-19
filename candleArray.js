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
    // is it time to create a new candle? if empty, or if timeInterval elapsed: yes
		if (this.size === 0 ||
        trade.time - this.lastCandle.openTime > this.secondsInterval*1000) {

      if (this.size>0) {
        console.log("[candleArray] running calculations on lastCandle...");
        this.lastCandle.ma10 = this.movingAvg(10, this.lastCandle.average);
        console.log('[candleArray] ma10 calculated:', this.lastCandle.ma10);
        this.lastCandle.ma21 = this.movingAvg(21, this.lastCandle.average);
        console.log('[candleArray] ma21 calculated:', this.lastCandle.ma21);
        this.lastCandle.ema = this.expMovingAvg
        console.log('[candleArray] ema calsulated:', this.lastCandle.ema);
  			console.log('[candleArray] writing lastCandle to DB...');
        this.DB.insertOne(this.lastCandle, err => {
          assert.equal(err, null)
        })
      }
      console.log('- [botTrader] creating new candle...')
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
      if (this.size > this.maxCandles) {
        console.log('[candleArray] removing candle...', this.firstCandle);
        this.candles.shift();
      }
		} else this.lastCandle.add(trade);
  }

  movingAvg(prev_candles, fallback) {
    let ma = 0,
      total = 0;

    if (prev_candles > this.size) prev_candles = this.size;
    for (let i=this.size-prev_candles; i<this.size; i++){
      let tb = this.candles[i];
      ma += tb.amtxpri;
      total += tb.volume;
    }
    let lastAvg = this.lastCandle.average;
    if (total > 0) return ma/total;
    else if (lastAvg > 0) return lastAvg;
    return fallback
  }

  get expMovingAvg() {
    // if first candle: return SMA21
		// else: return SMA21 + a * (this period's SMA21 - last period's EMA)
		// https://en.wikipedia.org/wiki/Moving_average#Exponential_moving_average
    let YEMA = 0,
      a = 2/(this.size+1),
      SMA = this.movingAvg(21, this.lastCandle.average);
    if (this.size > 1) {
      YEMA = this.candles[this.size-2].ema;
    } else {
      return SMA
    }
    return YEMA+a*(SMA-YEMA)
  }

  get size() {
    return this.candles.length
  }

  get lastCandle() {
    return this.size > 0 ? this.candles[this.candles.length-1] : null
  }

  get firstCandle() {
    return this.candles[0]
  }

  get interval() {
    return this.secondsInterval
  }
}

module.exports = CandleArray;
