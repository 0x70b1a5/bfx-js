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
    let shouldMakeNewCandle = true;
		if (this.size>0)
			shouldMakeNewCandle =
        trade.time - this.lastCandle.openTime > this.secondsInterval;
		if (shouldMakeNewCandle){
			if (this.size>0) {
        // write next-newest candle to db
        let candle = this.lastCandle,
          that = this;
        candle.ma10 = this.movingAvg(10,candle.average);
        candle.ma21 = this.movingAvg(21,candle.average);
        this.expMovingAvg((ema) => {
          candle.ema = that.lastCandle.ema = ema;
          that.DB.insertOne(candle);
        })
			}
			// add new candle to bucket afterward to avoid including it in MA calculation
			let newCandle = new Candle();
			newCandle.add(trade);
			this.candles.push(newCandle);
		} else this.lastCandle.add(trade);
		if (this.size > this.maxCandles) this.candles.shift();
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
    return (total > 0) ? ma/total : (lastAvg > 0) ? lastAvg : fallback
  }

  expMovingAvg(callback) {
    // if first candle: return SMA21
		// else: return SMA21 + a * (this period's SMA21 - last period's EMA)
		// https://en.wikipedia.org/wiki/Moving_average#Exponential_moving_average
    let YEMA = 0,
      a = 2/(this.size+1),
      SMA = this.movingAvg(21, 0);
    if (this.size > 1) {
      YEMA = this.candles[this.size-2].ema;
    } else {
      return this.DB.find().sort({openTime:-1}).limit(1).toArray((err, rows) => {
        assert.equal(err, null);
        YEMA = rows.ema || SMA;
        callback(YEMA+a*(SMA-YEMA));
      });
    }
    callback(YEMA+a*(SMA-YEMA))
  }

  get size() {
    return this.candles.length
  }

  get lastCandle() {
    return this.size > 0 ? this.candles[this.candles.length-1] : null
  }

  get interval() {
    return this.secondsInterval
  }
}

module.exports = CandleArray;
