const Bot = require('./bot')
const Order = require('./order');
const assert = require('assert');

class Exchange {
  constructor(websocket, rest, testmode) {
    this.testmode = testmode;
    this.testmode ? console.log("[testmode] exchange will not place orders")
      : console.log("[production] exchange will place live orders");
    this.orders = [];
    this.currentTradePrice = 0;
    this.w = websocket;
    this.rest = rest;
    this.balances = {
      "BTC": 0, "USD": 0
    }
  }

  initializeOrders(orders) {
    console.log("[exchange] found", orders.length, "existing orders");
    for (let order of orders) {
      let o = new Order(order[0], order[16], order[6], (order[6] > 0 ? "buy" : "sell"));
      console.log("[exchange] ", o);
      this.orders.push(o)
    }
  }

  placeOrder(order) {
    if (!this.testmode) {
      let o = [
        0,
        "on",
        null,
        {
          "gid": 1,
          "cid": `${order.id}`,
          "type": "EXCHANGE LIMIT",
          "symbol": "tBTCUSD",
          "amount": `0.1`,
          "price": `${order.price}`,
          "hidden": 0
        }
      ];
      console.log("[exchange] placing order...");
      // TODO negative amount for sell
      // & conversion of $ to B for buys
      this.w.send(JSON.stringify(o));
      this.orders.push(o);
      console.log(o);
    } else {
      console.log("[exchange] [testmode] order not placed:", order);
    }
  }

  removeOrder(oid) {
    for (let o of this.orders) {
      if (o.id == oid) {
        let i = this.orders.indexOf(o);
        this.orders = this.orders.slice(0,i).concat(this.orders.slice(i+1));
        return
      }
    }
  }

  updateBalances() {
    this.rest('auth/r/wallets', {}, (err, res, body) => {
      assert.equal(err, null)
      body.forEach((wallet) => {
        if (this.balances.hasOwnProperty(wallet[1]) && wallet[0]=='exchange') {
          console.log(`[balance] ${wallet[1]}`, wallet[2]);
          this.balances[wallet[1]] = wallet[2];
          assert.equal(this.balances[[wallet[1]]], wallet[2])
        }
      })
    })
  }

  get lastOrder() {
    return this.orders[this.orders.length-1]
  }
}

module.exports = Exchange;
