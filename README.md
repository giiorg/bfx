# Some notes:

- I tried to add mechanism to get initial state for newly joined clients (naive implementation)
- Tried to implement OrderBook for 1 market (trading pair), again, brute-force and naive implementation
- Added simple time interval that produces new orders every 5 sec, to simulate creating orders from each running client, it publishes/broadcasts orders, clients are listening and updating their order books.
- In current draft, matching running at the time new order is received, that is not desired behavior, I was planning to make separate service instance(s) that does actual matching and call matching logic from there (getting the current state from one of the client (assuming kind of eventual consistency), and broadcasting changes - what should be removed from order book and what should be added as a remainer)
