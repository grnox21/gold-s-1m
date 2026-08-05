# gold-s-1m

**GoldLiquiditySweepEA** — an MQL5 Expert Advisor for MetaTrader 5 that
trades XAUUSD (Gold) using a liquidity-sweep + M1-reversal strategy,
built around risk rules sized for a small ($100) account.

- EA source: [`MQL5/Experts/GoldLiquiditySweepEA.mq5`](MQL5/Experts/GoldLiquiditySweepEA.mq5)
- Mandatory pre-live validation steps: [`docs/BACKTESTING.md`](docs/BACKTESTING.md)

## Strategy — Liquidity Sweep + M1 Reversal

1. Locate a recent swing high/low (liquidity pool) on M15 (configurable).
2. Wait for price to sweep beyond that swing point (a wick or brief
   break past it) on M1.
3. Enter only after an M1 reversal candle closes back inside the range,
   in the direction of the higher-timeframe trend:
   - EMA200 on M15 is the trend filter.
   - Price above EMA200 → uptrend → **buy-side sweeps only** (sweep of
     a swing low, then reclaim).
   - Price below EMA200 → downtrend → **sell-side sweeps only** (sweep
     of a swing high, then rejection).
4. Stop loss: placed just beyond the swept wick extreme (variable
   distance, not a fixed number of points).
5. Take profit: same distance as the stop loss (1:1 risk/reward).

## Risk management (implemented exactly as specified)

| Rule | Behaviour |
|---|---|
| Risk per trade | 1.5% of **current equity**, converted to lot size via `lotSize = (equity * 0.015) / (stopDistancePoints * pointValue)`, rounded **down** to the broker's lot step (skips the trade rather than forcing a minimum lot that would over-risk) |
| Daily profit target | +6% of the day's starting equity → stop opening new trades for the rest of the day; open trades keep running |
| Daily loss cap | -5% of the day's starting equity → stop opening new trades for the rest of the day |
| Consecutive-loss breaker | 3 losing trades in the same day → stop opening new trades for the rest of the day, independent of the % loss cap |
| Account-level breaker | Equity 30% below the account's original starting balance → **all** new trading disabled, **no auto-resume** (persists across restarts; manual reset only via the `ResetAccountCircuitBreaker` input) |

## Filters

- **Trading window**: 11:00–19:00 Istanbul time (GMT+3, fixed, no DST).
  Outside this window only existing trades are managed (their SL/TP
  stay live at the broker); no new entries.
- **News filter**: blocks new entries 30 minutes before/after US rate
  decisions, CPI, NFP, and Fed speeches/announcements, using MT5's
  built-in Economic Calendar.

## Modular functions

`DetectLiquiditySweep()`, `DetectM1ReversalCandle()`, `GetTrendFilter()`,
`CalculateDynamicLot()`, `DailyRiskManager()`, `ConsecutiveLossTracker()`,
`NewsFilter()`, `TradingWindowFilter()` — each documented in-line in the
EA with the exact rule it implements.

## Backtesting — required before any live use

**Not yet performed.** See [`docs/BACKTESTING.md`](docs/BACKTESTING.md)
for the exact 1-year M1 Strategy Tester procedure and what the report
(win rate, avg win/loss, max consecutive losses, max drawdown %/$,
circuit-breaker trigger counts) must show before this EA is used on a
demo or live account. The EA's `OnTester()` formats that report
automatically from whatever run you perform in MT5.
