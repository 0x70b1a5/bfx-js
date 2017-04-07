const Bot = require('./bot')
const Order = require('./order');

class Exchange {
  constructor(websocket, testmode) {
    this.testmode = testmode;
    this.testmode ? console.log("[testmode] exchange will not place orders")
      : console.log("[production] exchange will place live orders");
    this.orders = [];
    this.currentTradePrice = 0;
    this.w = websocket;
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
    console.log("placing order...");
    let req = [ 0, 'on', null, {
        cid: Date.now(),
        type: "LIMIT",
        symbol: "tBTCUSD",
        amount: order.amount,
        price: order.price,
        hidden: 0
      }
    ];
    if (!this.testmode) {
      this.w.send(req)
    } else {
      console.log("making order request...", req);
    }
    this.orders.push(order);
    this.updateOrders();
  }

  updateBalance(currency, amount) {
    console.log("updating", currency, "balance... old", this.balances[currency], "new", amount);
    this.balances[currency] = amount;
  }
}

module.exports = Exchange;
