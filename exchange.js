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
      let o = new Order(order[16], order[6], (order[6] > 0 ? "buy" : "sell"));
      console.log("[exchange] ", o);
      this.orders.push(o)
    }
  }

  updateOrders() {
    //todo rest
  }

  placeOrder(order) {
    if (!this.testmode) {
      console.log("[exchange] placing order...");
      this.rest(
          '/order/new',
          {
            'symbol': "BTCUSD",
            'amount': order.amount,
            'price': order.price,
            'side': order.side,
            'type': 'limit'
          },
          (err, res, bod) => {
        console.log("err", err, "res", res, "bod", bod);
        assert.equal(err,null);
        this.orders.push(order);
        this.updateOrders();
      })
    } else {
      console.log("[exchange] [testmode] order not placed:", req);
    }
  }

  removeOrder(oid) {
    // TODO: search and remove
    this.orders.shift()
  }

  updateBalances() {
    this.rest('auth/r/wallets', {}, (err, res, body) => {
      assert.equal(err, null)
      body.forEach((wallet) => {
        if (this.balances.hasOwnProperty(wallet[1]) && wallet[0] == 'exchange') {
          console.log("[exchange] updating", wallet[1], "balance... old", this.balances[wallet[1]], "new", wallet[2]);
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
