"use strict";

class OrderBook {
  constructor() {
    this._buyOrders = [];
    this._sellOrders = [];
    this._queue = [];
    this._matching = false;
  }

  dumpBuyOrders() {
    return this._buyOrders;
  }

  dumpSellOrders() {
    return this._sellOrders;
  }

  addOrder(order) {
    this._onOrderAddedCallback(JSON.stringify(order));
  }

  addOrders(orders) {
    this._buyOrders = orders.buyOrders;
    this._sellOrders = orders.sellOrders;
  }

  receiveOrder(order) {
    if (!this._matching) {
      this.add(order);
      this.matchOrders();
    } else {
      this.addToQueue(order);
    }
  }

  addToQueue(order) {
    this._queue.push(order);
  }

  isQueueEmpty() {
    return this._queue.length === 0;
  }

  fromQueueToOrders() {
    if (!this.isQueueEmpty()) {
      console.log("from queue to orders");

      for (let i = 0; i < this._queue.length; i++) {
        const order = this._queue.pop();
        this.add(order);
      }

      this.matchOrders();
    }
  }

  add(order) {
    console.log("got order:", order);
    // TODO: brute force implementation
    // binary search can be used for insertion; and/or better DS can be thought of for priority handling

    const factor = order.kind === "BUY" ? 1 : -1;
    const sort = (a, b) => {
      if (a.price < b.price) {
        return -1 * factor;
      }
      if (a.price > b.price) {
        return 1 * factor;
      }

      if (a.timestamp < b.timestamp) {
        return -1;
      }
      if (a.timestamp > b.timestamp) {
        return 1;
      }

      return 0;
    };

    if (order.kind === "BUY") {
      this._buyOrders.push(order);
      this._buyOrders.sort(sort);
    } else {
      this._sellOrders.push(order);
      this._sellOrders.sort(sort);
    }
  }

  matchOrders() {
    this._matching = true;

    let i = this._buyOrders.length - 1;
    let j = this._sellOrders.length - 1;

    while (i >= 0 && j >= 0) {
      if (this._buyOrders[i].price >= this._sellOrders[j].price) {
        const [buyOrder] = this._buyOrders.splice(i, 1);
        const [sellOrder] = this._sellOrders.splice(j, 1);
        console.log("Matched!", buyOrder, sellOrder);
        i--;
        j--;

        // TODO: here, before popping orders from order-book, some service is needed to actually execute exchange (for buyOrder.price)

        const diff = buyOrder.amount - sellOrder.amount;

        if (diff < 0) {
          j++;
          this.receiveOrder({
            ...sellOrder,
            amount: diff * -1,
          });
        } else if (diff > 0) {
          i++;
          this.receiveOrder({
            ...buyOrder,
            amount: diff,
          });
        }

        if (!this.isQueueEmpty()) {
          console.log(
            "queue is not empty, exiting matching; queue length - ",
            this._queue.length
          );
          break;
        }
      } else {
        break;
      }
    }

    this._matching = false;
    this.fromQueueToOrders();
  }

  onOrderAdded(callback) {
    this._onOrderAddedCallback = callback;
    return this;
  }
}

module.exports = { orderBook: new OrderBook() };
