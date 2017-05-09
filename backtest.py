import pymongo
import matplotlib.pyplot as plt

cli = pymongo.MongoClient('mongodb://localhost:27017/')
db = cli.bfx

bands = [band for band in db.bands.find()]
candles = [candle for candle in db.candles.find()[10:]]
trades = [trade for trade in db.trades.find()]

plt.figure(1)
plt.subplot(211)
plt.plot([ (b["high"],b["ema"],b["low"]) for b in bands ])
plt.plot([ d["close"] for d in candles ])
plt.subplot(212)
plt.hist([ z["volume"] for z in candles ], len(candles))

# R Crumb comics
