# gold-s-1m

MetaTrader 5 Expert Advisor for fast M1 scalping on XAUUSD (Gold).

## File

- `MQL5/Experts/GoldScalpingM1_EA.mq5` — the complete, single-file EA.

## Install

1. Copy `GoldScalpingM1_EA.mq5` into your terminal's `MQL5/Experts/` folder
   (in MetaEditor/MT5: *File → Open Data Folder → MQL5 → Experts*).
2. Open it in MetaEditor and compile (F7). No external dependencies beyond
   the standard `<Trade\Trade.mqh>` include that ships with MT5.
3. Attach it to an **XAUUSD, M1** chart.

## Strategy summary

- **Timeframe:** M1 only — entries are evaluated once per confirmed bar close.
- **Entry:** buy when the closed M1 candle is bullish and closes above EMA(9);
  sell when it's bearish and closes below EMA(9). No other filters/timeframes.
- **Exits:** fixed TP/SL in points, breakeven once price moves in favor by a
  configurable distance, then a trailing stop.
- **Session:** trades only 11:00–19:00 Istanbul time (GMT+3); open positions
  are still managed outside that window.
- **Lot sizing:** adjustable cumulative "doubling" table (balance → lot),
  configurable via input strings, not hardcoded.
- **Daily circuit breaker:** closes everything and stops trading for the rest
  of the day once equity is +20% or −10% versus the day's starting equity
  (reset each day at the 11:00 Istanbul session start).
- **Entry blocking:** max spread, max concurrent trades, and a sideways-market
  filter (candle body vs. recent average range) are all adjustable inputs.
- **Statistics:** win rate, average win/loss, longest losing streak, and max
  drawdown are printed to the Experts log on removal, plus a per-trade CSV
  log written to `MQL5/Files/`. `OnTester()` also returns profit/drawdown as
  a ready-made Strategy Tester optimization criterion.

> Note: the news-event blackout filter has been removed from this version —
> the EA no longer blocks entries around scheduled news events.

Every tunable number from the spec (TP/SL points, breakeven trigger, session
start/end, daily profit/loss %, lot table, max spread, max open trades, etc.)
is exposed as an `input` parameter — no need to touch the code to tune it.

## Backtesting

Before using live, run it in the Strategy Tester on at least one full year of
M1 XAUUSD tick/history data ("Every tick" or "1 minute OHLC" model) and check
the Experts-log summary plus the generated CSV for win rate, average win/loss,
longest losing streak, and max drawdown.
