# Backtesting Requirement — GoldLiquiditySweepEA

> **This EA has not been backtested.** No MetaTrader 5 terminal, broker
> feed, or historical XAUUSD M1 data was available in the environment
> that produced this source code, so no performance numbers in this repo
> are real results — none are claimed. The steps below are what **you**
> must run, in your own MT5 installation, before any demo or live use.
> `OnTester()` in the EA formats whatever run you perform into the
> report described in the task (win rate, avg win/loss, max consecutive
> losses, max drawdown, circuit-breaker counts) — it does not invent
> numbers on its own.

## 1. Get one full year of XAUUSD M1 data

1. In MT5: **View → Symbols → XAUUSD**, or use your broker's own gold
   symbol if it's suffixed (e.g. `XAUUSD.a`, `GOLD`).
2. Open **Tools → History Center** (or **View → History Center**),
   select the symbol, timeframe M1, and download/import at least 1 year
   of history. Tick data quality varies a lot by broker — prefer a
   broker/data vendor with **"Every tick based on real ticks"** quality
   if available, since a $100 account with 1.5% risk is sensitive to
   fill/spread modelling.
3. If your broker's history is short, use a third-party M1 data
   provider (Dukascopy, TickStory, etc.) and import it via
   **History Center → Import**.

## 2. Configure the Strategy Tester

1. **View → Strategy Tester** (Ctrl+R).
2. Expert: `GoldLiquiditySweepEA`.
3. Symbol: `XAUUSD` (or your broker's gold symbol — update the EA's
   `_Symbol` usage only if you hardcode a different symbol; by default
   it trades whatever chart/symbol it's attached to).
4. Period: `M1`.
5. Date range: at least 1 full year (e.g. 2025-01-01 → 2026-01-01).
6. Model: **"Every tick based on real ticks"** if you have that data
   quality; otherwise **"Every tick"** (simulated) is the next best —
   avoid **"Open prices only"**, it cannot evaluate an M1-candle-based
   strategy correctly.
7. Deposit: **100**, currency USD (matches the account this EA was
   designed for).
8. Leverage: match the real account you intend to trade on.
9. Set inputs to the defaults in the EA (or your intended live
   settings) — in particular verify `RiskPercentPerTrade`,
   `DailyProfitTargetPercent`, `DailyLossCapPercent`,
   `MaxConsecutiveLosses`, and `AccountCircuitBreakerPercent` match
   what you actually plan to run live.
10. Enable **"Use date"**, tick **Visualization off** for speed on the
    first full run.

## 3. Economic-calendar caveat (news filter)

`NewsFilter()` uses MT5's built-in Economic Calendar
(`CalendarValueHistory` / `CalendarEventById`). Historical calendar
data for backtesting requires:
- A recent MT5 terminal build with backtest calendar support enabled.
- The calendar to actually be populated/synced for the tested date
  range before you launch the test (open the Economic Calendar tab
  once, let it sync, then run the test).

If your terminal/build doesn't support historical calendar events in
the tester, `NewsFilter()` fails open (does not block) — the backtest
will then **not** reflect the news blackout windows. Cross-check a
sample of trade timestamps against a manual news calendar if you're
unsure your build supports this, and disable/enable `UseNewsFilter` to
compare results with and without the filter.

## 4. Run and read the report

After the run completes, check:
- The **Journal/Experts tab** for the printed report block from
  `OnTester()`.
- `MQL5/Files/GoldLiquiditySweepEA_Report.csv` (or
  `Tester/Agent-xxx/MQL5/Files/...` depending on tester mode) for the
  same report saved to disk.
- The Strategy Tester's own **Results** tab and **Graph** tab for the
  equity curve, and the standard MT5 backtest report (right-click →
  **Save as Report**) for the full breakdown (profit factor, Sharpe,
  recovery factor, etc.) alongside the EA's own summary.

The report must include, per the spec:
- **Win rate**
- **Average win vs. average loss**
- **Max consecutive losing streak**
- **Max drawdown, in % and in $**
- **How often each circuit breaker triggered**:
  - Daily profit target (+6%)
  - Daily loss cap (-5%)
  - Consecutive-loss breaker (3 in a row)
  - Account-level breaker (-30% from starting balance)

## 5. Mandatory flag: -30% account circuit breaker

If the report's `Account (-30%) breaker` line says **TRIGGERED**, or
the max balance/equity drawdown % is at or above
`AccountCircuitBreakerPercent`, **do not proceed to demo/live trading**
without first understanding why the strategy drew down that far and
revisiting `RiskPercentPerTrade`, the entry filters, or the strategy
itself. The EA's own live behavior on a real/demo account already
refuses to resume trading automatically once this breaker trips (see
`ResetAccountCircuitBreaker` input) — but a backtest hitting this
threshold at all is a signal the strategy/risk settings, not just the
breaker, need review before real money is involved.

## 6. Walk-forward / out-of-sample check (recommended)

A single 1-year backtest is a minimum bar, not a sufficient one for a
1.5%-risk, small-account strategy. Before going live, also:
- Split the year into an in-sample period (e.g. first 9 months) used
  to sanity-check settings, and an out-of-sample period (last 3
  months) run untouched, to catch overfitting.
- Run on at least one additional prior year if data is available.
- Run a forward test on a demo account for several weeks in parallel
  with continued monitoring before any live capital is used.
