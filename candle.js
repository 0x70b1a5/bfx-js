class Candle {
  constructor(lastma10, lastma21, lastema) {
    this.empty = true;
    this.amtxpri = 0;
		this.volume = 0;
		this.low = 0;
		this.high = 0;
		this.open = 0;
		this.close = 0;
		this.ma10 = lastma10 || 0;
		this.ma21 = lastma21 || 0;
		this.ema = lastema || 0;
    this.openTime = Date.now();
  }

  add(trade) {
    this.amtxpri += Math.abs(trade.amount)*trade.price;
    this.volume += Math.abs(trade.amount);

    if (this.empty) {
      this.low = trade.price;
      this.high = trade.price;
			this.open = trade.price;
			this.close = trade.price;
			this.openTime = trade.time;
			this.empty = false;
		}	else {
			this.low = (trade.price < this.low) ? trade.price : this.low;
			this.high = (trade.price > this.high) ? trade.price : this.high;
			this.close = trade.price;
		}
  }

  get average() {
    return (this.volume !== 0) ? this.amtxpri/this.volume : 0
  }
}

module.exports = Candle;
