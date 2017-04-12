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
    this.isTimeToBuy = true;
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
    if (this.exchange.orders.length > 0 ||
        this.state !== this.states.ACTIVE ||
        !this.candles.lastCandle) return;
    let order, price, amount, side,
      lastMA = this.candles.lastCandle.ma10;
    if (this.isTimeToBuy) {
      price = lastMA*(1-this.lowerMargin);
      amount = this.exchange.balances.USD/price /10; // only trade 0.1th for now
      side = "buy"
    } else {
      price = this.lastOrder.price*(1+this.upperMargin);
      amount = -1*this.exchange.balances.BTC; // -1 = sell
      side = "sell"
    }
    order = new Order(price, amount, side);
    console.log("[finiteStateBot] created order: ", JSON.stringify(order));
    this.isTimeToBuy = !this.isTimeToBuy;
    // return order;
  }

  determineState() {
    if (this.state === this.states.ACTIVE) {
      let vi = this.getVolatilityIndex(this.volatilityBlocks);
      if (vi < this.volatilityThreshold) {
        console.log("[FiniteStateBot] volatility low. going PASSIVE");
        this.state = this.states.PASSIVE;
        // TODO Upon going PASSIVE: cancel outstanding buy orders
      }
    } else if (this.state === this.states.PASSIVE) {
      this.getEMADerivatives(1, (emad1) => {
        this.getEMADerivatives(2, (emad2) => {
          if (emad1 > emad2) {
            console.log("[FiniteStateBot] volatility high. going ACTIVE");
            this.state = this.states.ACTIVE;
          }
        });
      })
    } else {
      console.log("[FiniteStateBot] bot has invalid state!", this.state);
      throw Error
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

  getEMADerivatives(blocks, callback) {
    // TODO can probably turn below db call into this.super.lastDBcandle(callback)
    this.candleDB.find().sort({openTime:-1}).limit(blocks).toArray((err,rows) => {
      assert.equal(err, null);
      let emad = 0;
      for (let row of rows) { // we may be able to eliminate need for variable with .map()
        emad += row.ema;
      }
      callback(emad/2) // ... is it always 2? ...
    })
  }
}

module.exports = FiniteStateBot;
