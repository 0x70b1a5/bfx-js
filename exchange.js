const Bot = require('./bot')
const Order = require('./order');

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
    console.log("found", orders.length, "existing orders");
    for (let order of orders) {
      this.orders.push(new Order(order[12], order[6]))
    }
  }

  updateOrders() {

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

  updateBalance(currency, amount) {
    console.log("updating", currency, "balance... old", this.balances[currency], "new", amount);
    this.balances[currency] = amount;
  }
}

module.exports = Exchange;
