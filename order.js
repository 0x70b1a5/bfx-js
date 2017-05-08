class Order {
  constructor(id, price, amount, side) {
    this.id = id;
    this.price = this.round(price,2);
    this.amount = this.round(amount,4);
    this.side = side;
  }

  round(number, precision) {
    var factor = Math.pow(10, precision);
    var tempNumber = number * factor;
    var roundedTempNumber = Math.round(tempNumber);
    return roundedTempNumber / factor;
  }
}
module.exports = Order;
