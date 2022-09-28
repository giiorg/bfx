"use strict";

const { PeerSub, PeerPub } = require("grenache-nodejs-ws");

const { PeerRPCServer, PeerRPCClient } = require("grenache-nodejs-http");
const Link = require("grenache-nodejs-link");
const { orderBook } = require("./orderbook");

const link = new Link({
  grape: "http://127.0.0.1:30001",
});
link.start();

const link2 = new Link({
  grape: "http://127.0.0.1:40001",
});
link2.start();

function startRPCServer() {
  const peerServer = new PeerRPCServer(link, {
    timeout: 300000,
  });
  peerServer.init();

  const port = 101 + Math.floor(Math.random() * 4000);
  const service = peerServer.transport("server");
  service.listen(port);

  setInterval(function () {
    link.announce("get_initial_state", service.port, {});
  }, 1000);

  service.on("request", (rid, key, payload, handler) => {
    console.log(key);
    console.log(payload);

    switch (key) {
      case "get_initial_state":
        handler.reply(
          null,
          JSON.stringify({
            buyOrders: orderBook.dumpBuyOrders(),
            sellOrders: orderBook.dumpSellOrders(),
          })
        );
        break;
      default:
        handler.reply(null, { msg: "world" });
    }
  });
}

function startSubscribe() {
  const peerSub = new PeerSub(link2, {});
  peerSub.init();

  peerSub.sub("broadcast_order", { timeout: 10000 });

  peerSub.on("connected", () => {
    console.log("connected");
  });

  peerSub.on("disconnected", () => {
    console.log("disconnected");
    console.log("retrying connecting...");
    startSubscribe();
  });

  peerSub.on("error", (err) => {
    console.error(err.message);
  });

  peerSub.on("message", (message) => {
    const order = JSON.parse(JSON.parse(message));
    orderBook.receiveOrder(order);
    console.log(
      "buy orders:",
      JSON.stringify(orderBook.dumpBuyOrders(), null, 2)
    );
    console.log(
      "sell orders:",
      JSON.stringify(orderBook.dumpSellOrders(), null, 2)
    );
  });
}

function startPublisher() {
  const peerPub = new PeerPub(link, {});
  peerPub.init();

  const servicePub = peerPub.transport("server");
  servicePub.listen(2024 + Math.floor(Math.random() * 1000));

  setInterval(function () {
    link.announce("broadcast_order", servicePub.port, {});
  }, 1000);

  orderBook.onOrderAdded((order) => {
    servicePub.pub(JSON.stringify(order));
  });

  function randKind() {
    return Math.random() > 0.5 ? "SELL" : "BUY";
  }
  function randSenderId() {
    return 1 + Math.floor(Math.random() * 10);
  }

  function randPrice() {
    return 1 + Math.floor(Math.random() * 100);
  }

  function randAmount() {
    return 1 + Math.floor(Math.random() * 100);
  }

  function randPair() {
    // for simplicity, using only one market
    const pairs = ["tETHUSDC"];
    return pairs[0];
  }

  setInterval(() => {
    orderBook.addOrder({
      kind: randKind(),
      pair: randPair(),
      price: randPrice(),
      timestamp: new Date().valueOf(),
      amount: randAmount(),
      sellerId: randSenderId(),
    });
  }, 5000);
}

function startRPCClient() {
  const peerClient = new PeerRPCClient(link2);
  peerClient.init();

  peerClient.request(
    "get_initial_state",
    "",
    { timeout: 10000 },
    (err, data) => {
      if (err) {
        if (err.message === "ERR_GRAPE_LOOKUP_EMPTY") {
          console.log("No order book yet");
        } else {
          console.error("Was not able to get initial state");
          console.error(err);
          process.exit(-1);
        }
      } else {
        console.log("receiving initial state");
        orderBook.addOrders(JSON.parse(data));
      }
    }
  );

  setTimeout(() => {
    console.log("initializing publisher");
    startPublisher();

    setTimeout(() => {
      console.log("initializing subscription");
      startSubscribe();
    }, 2000);
  }, 2000);
}

startRPCServer();
setTimeout(() => {
  startRPCClient();
}, 2000);
