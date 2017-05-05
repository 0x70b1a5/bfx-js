const Order = require('./order')
const BotTrader = require ('./bot')
const assert = require('assert')

class FiniteStateBot extends BotTrader {
  constructor(exchange, numCandles, candleInterval, candleDB, tradesDB, lower, upper, vt, vb) {
    super(exchange, numCandles, candleInterval, candleDB, tradesDB);
    this.lowerMargin = lower;
    this.upperMargin = upper;
    this.volatilityThreshold = vt;
    this.volatilityBlocks = vb;
    this.states = Object.freeze({ // do not use 0 for values
      "ACTIVE": "ACTIVE",
      "PASSIVE": "PASSIVE"
    })
    this.state = this.states.ACTIVE;
    console.log("[finiteStateBot] initialized");
  }

  get state() {
    return this.currentState
  }

  set state(s) {
    if (!s in this.states) return false;
    this.currentState = s;
    console.log("[finiteStateBot] new state", this.currentState);
    return true
  }

  produceNextOrder() {
    // TODO extend bot for trades on multiple currencies; >1 orders
    console.log('[finiteStateBot] producing order...');
    if (this.exchange.orders.length > 0) {
      console.log('[finiteStateBot] order already exists. no order produced');
      return
    } else if (this.state !== this.states.ACTIVE) {
      console.log('[finiteStateBot] passive mode. no order produced');
      return
    } else if (!this.candles.lastCandle) {
      console.log('[finiteStateBot] no lastCandle. no order produced');
      return
    }

    let order, price, amount, side;
    if (this.isTimeToBuy()) {
      price = this.candles.lastCandle.ma10*(1-this.lowerMargin);
      amount = this.exchange.balances.USD/10; // only trade 0.1th for now
      side = "buy"
    } else {
      price = this.lastOrder.price*(1+this.upperMargin);
      amount = -1*this.exchange.balances.BTC; // -1 = sell
      side = "sell"
    }
    if (price === 0) {
      console.log('[finiteStateBot] cannot order: price incorrect');
      return null
    }
    order = new Order(Date.now()*1000, price, amount, side);
    console.log("[finiteStateBot] created order: ", JSON.stringify(order));
    return order;
  }

  isTimeToBuy() {
    if (!this.lastOrder || this.lastOrder.side == 'sell') return true;
    else return false
  }

  determineState() {
    if (this.state === this.states.ACTIVE) {
      let vi = this.getVolatilityIndex(this.volatilityBlocks);
      if (vi < this.volatilityThreshold) {
        console.log("[finiteStateBot] volatility low. going PASSIVE");
        this.state = this.states.PASSIVE;
        // TODO Upon going PASSIVE: cancel outstanding buy orders
      }
    } else if (this.state === this.states.PASSIVE) {
      if (this.getEMADerivatives(1) > this.getEMADerivatives(2)) {
        console.log("[FiniteStateBot] volatility high. going ACTIVE");
        this.state = this.states.ACTIVE;
      }
    } else {
      console.log("[finiteStateBot] bot has invalid state!", this.state);
      this.state = this.states.PASSIVE
    }
  }

  getVolatilityIndex(blocks) {
    let vi, avgPrice = avgPriceRange = 0;
    for (let i=this.size-blocks; i<this.size; i++){
      avgPriceRange += this.candles[i].high - this.candles[i].low;
      avgPrice += this.candles[i].average
    }

    return avgPriceRange/avgPrice*100
  }

  getEMADerivatives(blocks) {
    let emad = 0;
    for (let c=this.candles.length-blocks; c<this.candles.length; c++) {
      emad += this.candles[c].ema;
    }
    return(emad/blocks)
  }

  get lastOrder() {
    return this.exchange.lastOrder
  }
}

module.exports = FiniteStateBot;
