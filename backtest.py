import pymongo
import matplotlib.pyplot as plt

cli = pymongo.MongoClient('mongodb://localhost:27017/')
db = cli.bfx

bands = [band for band in db.bands.find()]
candles = [candle for candle in db.candles.find()[5:]]
trades = [trade for trade in db.trades.find()]

plt.plot([ (b["high"],b["ema"],b["low"]) for b in bands ])
plt.plot([ c["close"] for c in candles ])
