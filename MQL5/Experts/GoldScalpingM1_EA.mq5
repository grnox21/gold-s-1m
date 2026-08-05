//+------------------------------------------------------------------+
//|                                         GoldScalpingM1_EA.mq5     |
//|                                                                    |
//| Fast M1 scalping Expert Advisor for XAUUSD (Gold) - MetaTrader 5. |
//|                                                                    |
//| Strategy summary (see numbered sections below for full spec):     |
//|   1. General settings / symbol / risk switches                    |
//|   2. Cumulative "doubling" lot-size table                         |
//|   3. Entry logic (win-rate tuned): M1 candle direction + fast EMA |
//|      position, on the close of a confirmed bar only (no           |
//|      repainting), filtered by: minimum $ separation past the EMA |
//|      (momentum), prior-candle agreement (2-candle confirmation),  |
//|      and a slower trend EMA (only trade with the trend)           |
//|   4. Trade management: TP/SL/breakeven/trailing defined as a $    |
//|      price move (not broker points), then trailing stop           |
//|   5. Daily profit-target / max-loss circuit breaker               |
//|   6. Entry-blocking conditions (spread, sideways market, max      |
//|      concurrent trades, daily stops already hit, post-loss        |
//|      cooldown)                                                    |
//|   7. Built-in statistics (win rate, avg win/loss, losing streak,  |
//|      drawdown) plus a signal-funnel breakdown, logged to the      |
//|      Experts tab and to a CSV file for Strategy Tester evaluation.|
//|                                                                    |
//| No trading-hours restriction and no news-event filter: the EA can |
//| open trades at any time, on any M1 candle that satisfies the      |
//| entry signal. The extra filters in section 3 trade fewer, higher- |
//| quality signals for a better win rate - all individually toggle-  |
//| able/tunable via inputs, so the original pure candle+EMA9 logic   |
//| can be restored by disabling them.                                |
//|                                                                    |
//| All numeric parameters are exposed as inputs - no magic numbers   |
//| are hardcoded in the trading logic itself.                        |
//+------------------------------------------------------------------+
#property copyright "Gold Scalping M1 EA"
#property version   "1.00"

#include <Trade\Trade.mqh>

//====================================================================
// 1. GENERAL
//====================================================================
input group "=== 1. General ==="
input ulong  InpMagicNumber        = 20260804;   // Magic number (identifies this EA's own orders)
input int    InpSlippagePoints     = 20;         // Max allowed slippage / deviation, points

//====================================================================
// 2. LOT SIZING (MONEY MANAGEMENT) - cumulative doubling table
//====================================================================
input group "=== 2. Lot Sizing Table ==="
input bool   InpUseLotTable        = true;       // true = use balance table below, false = always use InpFixedLot
input double InpFixedLot           = 0.01;       // Lot used when InpUseLotTable = false
input string InpLotTableBalances   = "50,100,200,400,800,1600,3200,6400,12800,25600"; // Balance thresholds ($), ascending, comma separated
input string InpLotTableLots       = "0.01,0.02,0.04,0.08,0.16,0.32,0.64,1.28,2.56,5.12"; // Lot for each threshold above (same order/count)

//====================================================================
// 3. ENTRY LOGIC (M1 candle direction + EMA9, plus win-rate filters)
//====================================================================
input group "=== 3. Entry Logic (M1, EMA) ==="
input int    InpEmaPeriod          = 9;          // Fast EMA period, applied to M1 close price (core signal)
input bool   InpUseTrendFilter     = true;       // Only BUY above the trend EMA / SELL below it (cuts counter-trend losers)
input int    InpTrendEmaPeriod     = 50;         // Slower EMA period used as the trend filter
input double InpMinEmaSeparationUSD = 0.10;      // Min $ distance close must clear past EMA9 (0 = off) - rejects weak near-touch signals
input bool   InpRequireTwoCandleAgreement = true; // Require the PRIOR candle to also agree in direction (cuts single-candle noise)

//====================================================================
// 4. TRADE MANAGEMENT
//====================================================================
input group "=== 4. Trade Management ==="
input double InpTakeProfitUSD       = 1.30;      // Take profit, $ price move (price +$1.30 in your favor closes the trade)
input double InpStopLossUSD         = 1.30;      // Stop loss, $ price move (price -$1.30 against you closes the trade) - same $1.30 on both buy and sell
input double InpBreakevenTriggerUSD = 0.50;      // Profit, $ price move, that triggers moving SL to the entry price
input double InpBreakevenLockUSD    = 0.0;       // $ of extra profit locked in at breakeven (0 = exactly the entry price, as requested)
input double InpTrailingStopUSD     = 0.60;      // Trailing stop distance, $ price move (active only after breakeven has fired)
input double InpTrailingStepUSD     = 0.10;      // Minimum improvement, $ price move, required before the trailing SL is moved again

//====================================================================
// 5. DAILY PROFIT / LOSS CIRCUIT BREAKER
//====================================================================
input group "=== 5. Daily Profit / Loss Rules ==="
input double InpDailyProfitTargetPct = 20.0;     // Daily profit target, % of the day's starting equity -> close all & stop for the day
input double InpDailyMaxLossPct      = 10.0;     // Daily max loss, % of the day's starting equity -> close all & stop for the day

//====================================================================
// 6. ENTRY BLOCKING CONDITIONS
//====================================================================
input group "=== 6. Entry Filters ==="
input double InpMaxSpreadUSD       = 0.80;       // Max allowed spread, $ price gap (Ask-Bid) - blocks new entries above this. Was broker "points" before, which on a 3-digit XAUUSD account could silently mean 200-300+ points and block almost every bar - this is now broker-independent like TP/SL. 0.80 gives headroom above Exness Standard's typical ~$0.20-0.40 XAUUSD spread without letting through extreme news-time spikes.
input int    InpMaxOpenTrades      = 10;         // Max simultaneously open trades opened by this EA (raised so signals aren't blocked while a previous trade is still open - needed to hit high daily trade counts)
input int    InpRangeAvgBars       = 20;         // Bars used to compute the average range (sideways-market filter)
input double InpMinBodyRatio       = 0.05;       // Min candle-body / average-range ratio required to accept a signal (loosened so most directional candles qualify, for higher trade frequency)
input int    InpCooldownAfterLossMin = 3;        // Minutes to pause new entries after a losing trade closes (0 = disabled) - avoids revenge/whipsaw re-entries

//====================================================================
// 7. STATISTICS / LOGGING (for backtest evaluation)
//====================================================================
input group "=== 7. Statistics / Logging ==="
input bool   InpPrintStatsOnDeinit = true;       // Print performance summary to the Experts log when EA is removed
input bool   InpWriteCsvLog        = true;       // Write a per-trade CSV log (win/loss, profit)
input string InpCsvFileName        = "GoldScalpingM1_EA_trades.csv"; // CSV file name, saved under MQL5\Files
input int    InpMinDailyTradesTarget = 50;       // Informational only: logs a warning if fewer trades than this fired that day (does NOT force trades - entries still come only from the strategy signal)

input group "=== Debug ==="
input bool   InpVerboseLogging     = false;      // Print the reason every time a potential entry is blocked

//====================================================================
// GLOBAL STATE
//====================================================================
CTrade   trade;                    // trading wrapper
int      g_emaHandle = INVALID_HANDLE;      // fast EMA (InpEmaPeriod) - the core signal
int      g_trendEmaHandle = INVALID_HANDLE; // slower EMA (InpTrendEmaPeriod) - trend filter
datetime g_lastBarTime = 0;        // time of the last M1 bar we already evaluated (new-bar detector)
datetime g_lastLossCloseTime = 0;  // close time of the most recent losing trade, for the cooldown filter

// --- daily circuit breaker state -----------------------------------
string   g_lastResetDateKey = "";  // "YYYY.MM.DD" of the last day the daily counters were reset
double   g_dailyStartEquity = 0;   // equity at the start of the current (server) calendar day
bool     g_dailyProfitHit   = false;
bool     g_dailyLossHit     = false;
int      g_dailyTradeCount  = 0;   // trades OPENED so far today (informational vs. InpMinDailyTradesTarget)

// --- drawdown tracking ----------------------------------------------
double   g_peakEquity     = 0;
double   g_maxDrawdownPct = 0;

// --- parsed lot table -------------------------------------------------
double   g_lotTableBalances[];
double   g_lotTableLots[];
int      g_lotTableCount = 0;

// --- trade statistics (section 7) --------------------------------------
int      g_totalClosedTrades = 0;
int      g_wins   = 0;
int      g_losses = 0;
double   g_sumWinProfit  = 0;
double   g_sumLossProfit = 0;   // stored as a negative number
int      g_curLossStreak = 0;
int      g_maxLossStreak = 0;

// --- signal funnel diagnostics: WHY bars didn't turn into a trade ------
int      g_barsSeen            = 0; // every new M1 bar OnTick evaluated
int      g_barsSkippedDailyHit = 0; // skipped: today's profit/loss target already hit
int      g_blockedSpread       = 0; // skipped: spread > InpMaxSpreadUSD
int      g_blockedMaxTrades    = 0; // skipped: already at InpMaxOpenTrades
int      g_blockedHistory      = 0; // skipped: not enough bars yet for the filters
int      g_blockedSideways     = 0; // skipped: sideways-market filter
int      g_noSignal            = 0; // reached the signal check, but candle/EMA9 didn't align
int      g_entriesAttempted    = 0; // signal fired, order was sent
int      g_entriesOpened       = 0; // signal fired, order accepted by the broker
int      g_blockedCooldown     = 0; // skipped: still inside the post-loss cooldown window
int      g_blockedMomentum     = 0; // candle had direction, but didn't clear the EMA9 separation threshold
int      g_blockedTwoCandle    = 0; // candle+EMA9 agreed, but the prior candle didn't confirm direction
int      g_blockedTrend        = 0; // candle+EMA9(+prior candle) agreed, but against the slower trend EMA

//+------------------------------------------------------------------+
//| Expert initialization function                                    |
//+------------------------------------------------------------------+
int OnInit()
{
   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints((ulong)InpSlippagePoints);

   // Fast EMA on M1 close - the core signal
   g_emaHandle = iMA(_Symbol, PERIOD_M1, InpEmaPeriod, 0, MODE_EMA, PRICE_CLOSE);
   if(g_emaHandle == INVALID_HANDLE)
   {
      Print("Failed to create EMA(", InpEmaPeriod, ") indicator handle. Error: ", GetLastError());
      return(INIT_FAILED);
   }

   // Slower EMA on M1 close - trend filter (only used if InpUseTrendFilter)
   g_trendEmaHandle = iMA(_Symbol, PERIOD_M1, InpTrendEmaPeriod, 0, MODE_EMA, PRICE_CLOSE);
   if(g_trendEmaHandle == INVALID_HANDLE)
   {
      Print("Failed to create trend EMA(", InpTrendEmaPeriod, ") indicator handle. Error: ", GetLastError());
      return(INIT_FAILED);
   }

   // --- parse the lot-sizing table from the input strings ---
   double balArr[], lotArr[];
   int nb = ParseDoubleList(InpLotTableBalances, balArr);
   int nl = ParseDoubleList(InpLotTableLots, lotArr);
   g_lotTableCount = (nb < nl) ? nb : nl;
   ArrayResize(g_lotTableBalances, g_lotTableCount);
   ArrayResize(g_lotTableLots, g_lotTableCount);
   for(int i = 0; i < g_lotTableCount; i++)
   {
      g_lotTableBalances[i] = balArr[i];
      g_lotTableLots[i]     = lotArr[i];
   }
   if(InpUseLotTable && g_lotTableCount == 0)
      Print("WARNING: lot table is empty/unparseable - falling back to InpFixedLot.");

   // --- reset all state ---
   g_lastBarTime       = 0;
   g_lastLossCloseTime = 0;
   g_lastResetDateKey  = "";
   g_dailyStartEquity  = AccountInfoDouble(ACCOUNT_EQUITY);
   g_dailyProfitHit    = false;
   g_dailyLossHit      = false;
   g_dailyTradeCount   = 0;
   g_peakEquity        = AccountInfoDouble(ACCOUNT_EQUITY);
   g_maxDrawdownPct    = 0;

   g_totalClosedTrades = 0; g_wins = 0; g_losses = 0;
   g_sumWinProfit = 0; g_sumLossProfit = 0;
   g_curLossStreak = 0; g_maxLossStreak = 0;

   g_barsSeen = 0; g_barsSkippedDailyHit = 0;
   g_blockedSpread = 0; g_blockedMaxTrades = 0; g_blockedHistory = 0;
   g_blockedSideways = 0; g_noSignal = 0;
   g_entriesAttempted = 0; g_entriesOpened = 0;
   g_blockedCooldown = 0; g_blockedMomentum = 0;
   g_blockedTwoCandle = 0; g_blockedTrend = 0;

   // Start each run (e.g. each Strategy Tester pass) with a fresh CSV log.
   if(InpWriteCsvLog && FileIsExist(InpCsvFileName))
      FileDelete(InpCsvFileName);

   if(StringFind(_Symbol, "XAU") < 0)
      Print("WARNING: chart symbol '", _Symbol, "' does not look like Gold (XAU...). ",
            "This EA is designed for XAUUSD.");

   Print("GoldScalpingM1_EA initialized on ", _Symbol, " M1. No trading-hours restriction - ",
         "entries are allowed at any time the signal fires.");

   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                  |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   if(g_emaHandle != INVALID_HANDLE)
      IndicatorRelease(g_emaHandle);
   if(g_trendEmaHandle != INVALID_HANDLE)
      IndicatorRelease(g_trendEmaHandle);

   if(InpPrintStatsOnDeinit)
      PrintStatistics();
}

//+------------------------------------------------------------------+
//| Expert tick function                                              |
//+------------------------------------------------------------------+
void OnTick()
{
   // 5. Roll the daily counters over at each new server calendar day.
   UpdateDailyReset();

   // Keep a running equity high-water-mark / drawdown reading (section 7).
   UpdateDrawdownStats();

   // Position management (breakeven + trailing stop) always runs, even
   // after the daily stop has fired - open trades must still be protected
   // (spec section 5).
   ManagePositions();

   // 5. Daily profit-target / max-loss circuit breaker.
   CheckDailyStops();

   // Only look for a new entry once per confirmed M1 bar close - never
   // intra-bar, so the signal never repaints.
   if(!IsNewBar())
      return;

   g_barsSeen++; // diagnostics: every confirmed M1 bar we actually evaluate

   if(g_dailyProfitHit || g_dailyLossHit)
   {
      g_barsSkippedDailyHit++; // 5 & 6. today's stop already hit - no more entries today
      return;
   }

   TryOpenNewTrade();
}

//+------------------------------------------------------------------+
//| Trade transaction event - used purely for statistics/CSV logging  |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction &trans,
                         const MqlTradeRequest &request,
                         const MqlTradeResult &result)
{
   if(trans.type != TRADE_TRANSACTION_DEAL_ADD)
      return;
   if(!HistoryDealSelect(trans.deal))
      return;

   // Only count deals that belong to this EA, on this symbol, and that
   // actually CLOSE a position (DEAL_ENTRY_OUT) - i.e. a finished trade.
   if((long)HistoryDealGetInteger(trans.deal, DEAL_MAGIC) != (long)InpMagicNumber) return;
   if(HistoryDealGetString(trans.deal, DEAL_SYMBOL) != _Symbol)                    return;

   ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(trans.deal, DEAL_ENTRY);
   if(entry != DEAL_ENTRY_OUT && entry != DEAL_ENTRY_OUT_BY)
      return;

   double profit = HistoryDealGetDouble(trans.deal, DEAL_PROFIT)
                  + HistoryDealGetDouble(trans.deal, DEAL_SWAP)
                  + HistoryDealGetDouble(trans.deal, DEAL_COMMISSION);

   g_totalClosedTrades++;
   if(profit >= 0)
   {
      g_wins++;
      g_sumWinProfit += profit;
      g_curLossStreak = 0;
   }
   else
   {
      g_losses++;
      g_sumLossProfit += profit;
      g_curLossStreak++;
      if(g_curLossStreak > g_maxLossStreak)
         g_maxLossStreak = g_curLossStreak;
      g_lastLossCloseTime = TimeCurrent(); // 6. starts the post-loss cooldown window
   }

   if(InpWriteCsvLog)
      LogTradeToCsv(trans.deal, profit);
}

//+------------------------------------------------------------------+
//| Custom optimization/backtest criterion (section 7): profit per    |
//| unit of maximum balance drawdown - a simple, robust objective for |
//| the Strategy Tester's optimizer.                                  |
//+------------------------------------------------------------------+
double OnTester()
{
   double profit = TesterStatistics(STAT_PROFIT);
   double dd     = TesterStatistics(STAT_BALANCEDD_PERCENT);
   if(dd <= 0.0)
      return profit;
   return profit / dd;
}

//====================================================================
// SECTION 3: ENTRY LOGIC
//====================================================================

//+------------------------------------------------------------------+
//| Detects a brand-new, fully closed M1 bar. Returns true exactly    |
//| once per bar, on the first tick of the new bar - the just-closed  |
//| candle is then bar shift 1. This guarantees no mid-candle /       |
//| repainted entries.                                                 |
//+------------------------------------------------------------------+
bool IsNewBar()
{
   datetime t0 = iTime(_Symbol, PERIOD_M1, 0);
   if(t0 == 0)
      return false;
   if(t0 != g_lastBarTime)
   {
      g_lastBarTime = t0;
      return true;
   }
   return false;
}

//+------------------------------------------------------------------+
//| Runs every entry-blocking check (section 6) and, if all pass,     |
//| evaluates the section-3 candle/EMA signal and opens a trade.      |
//| No trading-hours restriction - can fire at any time of day.       |
//+------------------------------------------------------------------+
void TryOpenNewTrade()
{
   // 6. Spread filter - computed as a straight $ gap (Ask-Bid), not points,
   // so it behaves identically regardless of the broker's quote digits.
   double spreadUSD = SymbolInfoDouble(_Symbol, SYMBOL_ASK) - SymbolInfoDouble(_Symbol, SYMBOL_BID);
   if(spreadUSD > InpMaxSpreadUSD)
   {
      g_blockedSpread++;
      if(InpVerboseLogging) Print("Blocked: spread $", DoubleToString(spreadUSD, 2), " > max $", DoubleToString(InpMaxSpreadUSD, 2));
      return;
   }

   // 6. Max concurrent open trades (this EA only).
   if(CountOpenPositions() >= InpMaxOpenTrades)
   {
      g_blockedMaxTrades++;
      if(InpVerboseLogging) Print("Blocked: max open trades (", InpMaxOpenTrades, ") reached");
      return;
   }

   // 6. Post-loss cooldown - skip fresh entries for a bit after a losing
   // trade closes, to avoid immediately re-entering into a whipsaw.
   if(InpCooldownAfterLossMin > 0 && g_lastLossCloseTime > 0 &&
      (TimeCurrent() - g_lastLossCloseTime) < InpCooldownAfterLossMin * 60)
   {
      g_blockedCooldown++;
      if(InpVerboseLogging) Print("Blocked: still inside post-loss cooldown");
      return;
   }

   // Need enough history for the sideways-market average-range filter and the EMAs.
   if(Bars(_Symbol, PERIOD_M1) < InpRangeAvgBars + InpTrendEmaPeriod + 3)
   {
      g_blockedHistory++;
      return;
   }

   // The just-closed M1 candle (shift 1) - the current bar (shift 0) is still forming.
   double open1  = iOpen(_Symbol, PERIOD_M1, 1);
   double close1 = iClose(_Symbol, PERIOD_M1, 1);

   // Fast EMA value aligned to that same closed candle.
   double emaBuf[];
   ArraySetAsSeries(emaBuf, true);
   if(CopyBuffer(g_emaHandle, 0, 1, 1, emaBuf) != 1)
   {
      g_blockedHistory++; // EMA buffer not ready yet - treat like a history gap
      return;
   }
   double ema1 = emaBuf[0];

   // 6. Sideways / no-clear-direction filter.
   if(IsSidewaysMarket(open1, close1))
   {
      g_blockedSideways++;
      if(InpVerboseLogging) Print("Blocked: sideways market (candle body too small vs average range)");
      return;
   }

   // 3. Core entry signal - M1 candle direction + fast EMA position.
   bool bullishCandle = (close1 > open1);
   bool bearishCandle = (close1 < open1);

   bool buySignal  = bullishCandle && (close1 > ema1);
   bool sellSignal = bearishCandle && (close1 < ema1);

   if(!buySignal && !sellSignal)
   {
      g_noSignal++; // candle direction and EMA9 position didn't agree on this bar
      return;
   }

   // 3. Momentum confirmation - close must clear the fast EMA by a minimum
   // $ margin, not just brush past it, to filter out weak near-touch signals.
   if(InpMinEmaSeparationUSD > 0)
   {
      double sep = MathAbs(close1 - ema1);
      if(sep < InpMinEmaSeparationUSD)
      {
         g_blockedMomentum++;
         if(InpVerboseLogging) Print("Blocked: EMA separation $", DoubleToString(sep, 2), " < min $", DoubleToString(InpMinEmaSeparationUSD, 2));
         return;
      }
   }

   // 3. Two-candle agreement - the PRIOR candle (shift 2) must point the
   // same direction, so a single noisy candle can't trigger a trade alone.
   if(InpRequireTwoCandleAgreement)
   {
      double open2  = iOpen(_Symbol, PERIOD_M1, 2);
      double close2 = iClose(_Symbol, PERIOD_M1, 2);
      bool prevBullish = (close2 > open2);
      bool prevBearish = (close2 < open2);
      if((buySignal && !prevBullish) || (sellSignal && !prevBearish))
      {
         g_blockedTwoCandle++;
         if(InpVerboseLogging) Print("Blocked: prior candle didn't confirm direction");
         return;
      }
   }

   // 3. Trend filter - only trade WITH the slower EMA's direction, to cut
   // down on counter-trend losers.
   if(InpUseTrendFilter)
   {
      double trendBuf[];
      ArraySetAsSeries(trendBuf, true);
      if(CopyBuffer(g_trendEmaHandle, 0, 1, 1, trendBuf) != 1)
      {
         g_blockedHistory++;
         return;
      }
      double trendEma1 = trendBuf[0];
      if((buySignal && close1 <= trendEma1) || (sellSignal && close1 >= trendEma1))
      {
         g_blockedTrend++;
         if(InpVerboseLogging) Print("Blocked: against the trend EMA(", InpTrendEmaPeriod, ")");
         return;
      }
   }

   double lot = GetLotSize();
   g_entriesAttempted++;

   // TP/SL are a straight $ price offset (XAUUSD quotes directly in USD per
   // ounce), not a points/digits count - so no broker point-size conversion
   // is needed here: a $1.30 target is the same $1.30 on every broker.
   if(buySignal)
   {
      double price = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double sl    = NormalizeDouble(price - InpStopLossUSD, _Digits);
      double tp    = NormalizeDouble(price + InpTakeProfitUSD, _Digits);
      if(trade.Buy(lot, _Symbol, price, sl, tp, "GoldScalpM1 buy"))
      {
         g_dailyTradeCount++; // 7. counts toward InpMinDailyTradesTarget
         g_entriesOpened++;
      }
      else
         Print("Buy order failed. Error: ", GetLastError());
   }
   else // sellSignal
   {
      double price = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double sl    = NormalizeDouble(price + InpStopLossUSD, _Digits);
      double tp    = NormalizeDouble(price - InpTakeProfitUSD, _Digits);
      if(trade.Sell(lot, _Symbol, price, sl, tp, "GoldScalpM1 sell"))
      {
         g_dailyTradeCount++; // 7. counts toward InpMinDailyTradesTarget
         g_entriesOpened++;
      }
      else
         Print("Sell order failed. Error: ", GetLastError());
   }
}

//+------------------------------------------------------------------+
//| 8. Sideways-market filter: reject the signal if the just-closed   |
//| candle's body is too small relative to the recent average range,  |
//| i.e. there is no clear directional movement.                      |
//+------------------------------------------------------------------+
bool IsSidewaysMarket(double open1, double close1)
{
   if(InpRangeAvgBars <= 0 || InpMinBodyRatio <= 0)
      return false; // filter disabled

   double body = MathAbs(close1 - open1);

   double sumRange = 0;
   for(int i = 2; i < InpRangeAvgBars + 2; i++)
      sumRange += (iHigh(_Symbol, PERIOD_M1, i) - iLow(_Symbol, PERIOD_M1, i));
   double avgRange = sumRange / InpRangeAvgBars;

   if(avgRange <= 0)
      return false; // not enough data yet - fail open rather than jam entries

   return (body < avgRange * InpMinBodyRatio);
}

//====================================================================
// SECTION 4: TRADE MANAGEMENT (breakeven + trailing stop)
//====================================================================

//+------------------------------------------------------------------+
//| Applies breakeven and trailing-stop logic to every open position  |
//| belonging to this EA on this symbol. Runs on every tick, even     |
//| after the daily stop has fired, so open trades stay protected.    |
//+------------------------------------------------------------------+
void ManagePositions()
{
   // stopsLevel is the ONE place points still matter: it's a broker-imposed
   // minimum distance between price and SL, always expressed in points by
   // the terminal. We convert it to a $ price distance once here so the
   // rest of the function can stay in plain $ terms.
   double point           = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   int    stopsLevelPts   = (int)SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL);
   double minStopDistance = stopsLevelPts * point;
   double bid             = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double ask             = SymbolInfoDouble(_Symbol, SYMBOL_ASK);

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || !PositionSelectByTicket(ticket))
         continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol)
         continue;
      if((ulong)PositionGetInteger(POSITION_MAGIC) != InpMagicNumber)
         continue;

      ENUM_POSITION_TYPE type   = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      double             openPr = PositionGetDouble(POSITION_PRICE_OPEN);
      double             curSL  = PositionGetDouble(POSITION_SL);
      double             curTP  = PositionGetDouble(POSITION_TP);
      double             newSL  = curSL;

      if(type == POSITION_TYPE_BUY)
      {
         double profitUSD = bid - openPr; // $ the price has moved in our favor

         if(profitUSD >= InpBreakevenTriggerUSD)
         {
            bool beActive = (curSL >= openPr); // SL already at/above entry -> breakeven already applied
            if(!beActive)
            {
               // Move SL to breakeven (entry + a small locked-in $ profit).
               double beSL = openPr + InpBreakevenLockUSD;
               if(beSL > curSL) newSL = beSL;
            }
            else
            {
               // Breakeven already active -> trail the stop as price advances further.
               double trailSL = bid - InpTrailingStopUSD;
               if(trailSL > openPr && trailSL > curSL + InpTrailingStepUSD)
                  newSL = trailSL;
            }
         }

         if(newSL != curSL && (bid - newSL) >= minStopDistance)
         {
            newSL = NormalizeDouble(newSL, _Digits);
            if(!trade.PositionModify(ticket, newSL, curTP) && InpVerboseLogging)
               Print("PositionModify failed (BUY) #", ticket, " err=", GetLastError());
         }
      }
      else if(type == POSITION_TYPE_SELL)
      {
         double profitUSD = openPr - ask; // $ the price has moved in our favor

         if(profitUSD >= InpBreakevenTriggerUSD)
         {
            bool beActive = (curSL > 0 && curSL <= openPr); // SL already at/below entry
            if(!beActive)
            {
               double beSL = openPr - InpBreakevenLockUSD;
               if(curSL == 0 || beSL < curSL) newSL = beSL;
            }
            else
            {
               double trailSL = ask + InpTrailingStopUSD;
               if(trailSL < openPr && (curSL == 0 || trailSL < curSL - InpTrailingStepUSD))
                  newSL = trailSL;
            }
         }

         if(newSL != curSL && (newSL - ask) >= minStopDistance)
         {
            newSL = NormalizeDouble(newSL, _Digits);
            if(!trade.PositionModify(ticket, newSL, curTP) && InpVerboseLogging)
               Print("PositionModify failed (SELL) #", ticket, " err=", GetLastError());
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Counts this EA's currently open positions on the traded symbol.   |
//+------------------------------------------------------------------+
int CountOpenPositions()
{
   int cnt = 0;
   for(int i = 0; i < PositionsTotal(); i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || !PositionSelectByTicket(ticket))
         continue;
      if(PositionGetString(POSITION_SYMBOL) == _Symbol &&
         (ulong)PositionGetInteger(POSITION_MAGIC) == InpMagicNumber)
         cnt++;
   }
   return cnt;
}

//+------------------------------------------------------------------+
//| Closes every open position belonging to this EA on this symbol.   |
//+------------------------------------------------------------------+
void CloseAllPositions()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || !PositionSelectByTicket(ticket))
         continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol)
         continue;
      if((ulong)PositionGetInteger(POSITION_MAGIC) != InpMagicNumber)
         continue;
      if(!trade.PositionClose(ticket))
         Print("Failed to close position #", ticket, " err=", GetLastError());
   }
}

//====================================================================
// SECTION 2: LOT SIZING
//====================================================================

//+------------------------------------------------------------------+
//| Returns the lot size for the next trade, based on the cumulative  |
//| balance->lot table (or InpFixedLot if the table is disabled).     |
//| The table is fully adjustable via InpLotTableBalances/Lots.       |
//+------------------------------------------------------------------+
double GetLotSize()
{
   double lot;

   if(!InpUseLotTable || g_lotTableCount <= 0)
   {
      lot = InpFixedLot;
   }
   else
   {
      double balance = AccountInfoDouble(ACCOUNT_BALANCE);
      lot = g_lotTableLots[0]; // default to the smallest/starting lot
      for(int i = 0; i < g_lotTableCount; i++)
      {
         if(balance >= g_lotTableBalances[i])
            lot = g_lotTableLots[i];
         else
            break; // table is ascending, so we can stop at the first threshold not yet reached
      }
   }

   // Clamp/round to what the symbol actually allows.
   double minLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   double stepLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   if(stepLot > 0)
      lot = MathRound(lot / stepLot) * stepLot;
   lot = MathMax(minLot, MathMin(maxLot, lot));

   return NormalizeDouble(lot, 2);
}

//====================================================================
// SECTION 5: DAILY PROFIT / LOSS CIRCUIT BREAKER
//====================================================================

//+------------------------------------------------------------------+
//| Resets the daily start-of-day equity and the daily hit-flags      |
//| exactly once, on the first tick of each new server calendar day.  |
//| (There is no trading-hours restriction anymore, so "day" here is  |
//| simply the broker/server calendar date rolling over.)             |
//+------------------------------------------------------------------+
void UpdateDailyReset()
{
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   string todayKey = StringFormat("%04d.%02d.%02d", dt.year, dt.mon, dt.day);

   if(todayKey != g_lastResetDateKey)
   {
      // Report the PREVIOUS day's trade count against the informational
      // target before resetting it, so you can see whether it was hit.
      if(g_lastResetDateKey != "")
      {
         if(g_dailyTradeCount < InpMinDailyTradesTarget)
            Print("Day ", g_lastResetDateKey, " finished with ", g_dailyTradeCount,
                  " trades - BELOW the ", InpMinDailyTradesTarget, "/day target ",
                  "(market didn't produce enough qualifying signals; entries are never forced).");
         else
            Print("Day ", g_lastResetDateKey, " finished with ", g_dailyTradeCount,
                  " trades - target of ", InpMinDailyTradesTarget, "/day met.");
      }

      g_lastResetDateKey = todayKey;
      g_dailyStartEquity = AccountInfoDouble(ACCOUNT_EQUITY);
      g_dailyProfitHit   = false;
      g_dailyLossHit     = false;
      g_dailyTradeCount  = 0;
      Print("New trading day started (", todayKey, "). Day-start equity = ",
            DoubleToString(g_dailyStartEquity, 2));
   }
}

//+------------------------------------------------------------------+
//| Checks the daily profit-target / max-loss thresholds against the  |
//| day's starting equity and, if hit, closes everything and disables |
//| further entries for the rest of the day.                          |
//+------------------------------------------------------------------+
void CheckDailyStops()
{
   if(g_dailyStartEquity <= 0)
      return;

   double equity    = AccountInfoDouble(ACCOUNT_EQUITY);
   double changePct = (equity - g_dailyStartEquity) / g_dailyStartEquity * 100.0;

   if(!g_dailyProfitHit && changePct >= InpDailyProfitTargetPct)
   {
      Print("Daily PROFIT target reached: ", DoubleToString(changePct, 2), "% >= +",
            DoubleToString(InpDailyProfitTargetPct, 2), "%. Closing all positions, no more entries today.");
      CloseAllPositions();
      g_dailyProfitHit = true;
   }

   if(!g_dailyLossHit && changePct <= -InpDailyMaxLossPct)
   {
      Print("Daily MAX LOSS reached: ", DoubleToString(changePct, 2), "% <= -",
            DoubleToString(InpDailyMaxLossPct, 2), "%. Closing all positions, no more entries today.");
      CloseAllPositions();
      g_dailyLossHit = true;
   }
}

//====================================================================
// DRAWDOWN TRACKING HELPER
//====================================================================

//+------------------------------------------------------------------+
//| Tracks the running equity high-water-mark and the resulting max   |
//| drawdown percentage, for the section-7 performance summary.       |
//+------------------------------------------------------------------+
void UpdateDrawdownStats()
{
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   if(equity > g_peakEquity)
      g_peakEquity = equity;

   if(g_peakEquity > 0)
   {
      double dd = (g_peakEquity - equity) / g_peakEquity * 100.0;
      if(dd > g_maxDrawdownPct)
         g_maxDrawdownPct = dd;
   }
}

//====================================================================
// STRING / LIST PARSING HELPERS
//====================================================================

//+------------------------------------------------------------------+
//| Splits a comma separated list of numbers into a double array.     |
//+------------------------------------------------------------------+
int ParseDoubleList(const string s, double &arr[])
{
   if(StringLen(s) == 0)
   {
      ArrayResize(arr, 0);
      return 0;
   }
   string parts[];
   int n = StringSplit(s, ',', parts);
   ArrayResize(arr, n);
   int cnt = 0;
   for(int i = 0; i < n; i++)
   {
      string t = parts[i];
      StringTrimLeft(t);
      StringTrimRight(t);
      if(StringLen(t) == 0) continue;
      arr[cnt++] = StringToDouble(t);
   }
   ArrayResize(arr, cnt);
   return cnt;
}

//====================================================================
// SECTION 7: STATISTICS / LOGGING
//====================================================================

//+------------------------------------------------------------------+
//| Appends one row to the CSV trade log (created with a header on    |
//| the first write).                                                  |
//+------------------------------------------------------------------+
void LogTradeToCsv(ulong dealTicket, double profit)
{
   bool fileExisted = FileIsExist(InpCsvFileName);
   int  handle = FileOpen(InpCsvFileName, FILE_READ | FILE_WRITE | FILE_CSV | FILE_ANSI, ',');
   if(handle == INVALID_HANDLE)
   {
      Print("CSV log open failed for '", InpCsvFileName, "'. Error: ", GetLastError());
      return;
   }

   FileSeek(handle, 0, SEEK_END);
   if(!fileExisted)
      FileWrite(handle, "CloseTime", "ClosedSide", "Volume", "Profit");

   datetime closeTime = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
   ENUM_DEAL_TYPE dealType = (ENUM_DEAL_TYPE)HistoryDealGetInteger(dealTicket, DEAL_TYPE);
   double vol = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);

   // The closing deal of a BUY position is a SELL deal, and vice versa.
   string closedSide = (dealType == DEAL_TYPE_SELL) ? "CLOSED_BUY" : "CLOSED_SELL";

   FileWrite(handle,
             TimeToString(closeTime, TIME_DATE | TIME_SECONDS),
             closedSide,
             DoubleToString(vol, 2),
             DoubleToString(profit, 2));
   FileClose(handle);
}

//+------------------------------------------------------------------+
//| Prints the section-7 performance summary to the Experts log:      |
//| win rate, average win/loss, longest losing streak, max drawdown.  |
//+------------------------------------------------------------------+
void PrintStatistics()
{
   double winRate = (g_totalClosedTrades > 0) ? (double)g_wins / g_totalClosedTrades * 100.0 : 0.0;
   double avgWin  = (g_wins   > 0) ? g_sumWinProfit  / g_wins   : 0.0;
   double avgLoss = (g_losses > 0) ? g_sumLossProfit / g_losses : 0.0;

   Print("========== GoldScalpingM1_EA Performance Summary ==========");
   Print("Total closed trades   : ", g_totalClosedTrades);
   Print("Win rate               : ", DoubleToString(winRate, 2), "%  (", g_wins, "W / ", g_losses, "L)");
   Print("Average win             : ", DoubleToString(avgWin, 2));
   Print("Average loss            : ", DoubleToString(avgLoss, 2));
   Print("Longest losing streak   : ", g_maxLossStreak);
   Print("Max equity drawdown     : ", DoubleToString(g_maxDrawdownPct, 2), "%");
   Print("CSV trade log           : ", InpWriteCsvLog ? InpCsvFileName : "(disabled)");
   Print("=============================================================");
   Print("----- Signal funnel: WHY bars did/didn't become a trade -----");
   Print("M1 bars evaluated            : ", g_barsSeen);
   Print("  - skipped, daily stop hit  : ", g_barsSkippedDailyHit);
   Print("  - blocked by spread        : ", g_blockedSpread);
   Print("  - blocked by max trades    : ", g_blockedMaxTrades);
   Print("  - blocked, post-loss cooldn: ", g_blockedCooldown);
   Print("  - blocked, not enough hist.: ", g_blockedHistory);
   Print("  - blocked, sideways market : ", g_blockedSideways);
   Print("  - no signal (candle/EMA9)  : ", g_noSignal);
   Print("  - blocked, EMA9 separation : ", g_blockedMomentum);
   Print("  - blocked, 2-candle agree  : ", g_blockedTwoCandle);
   Print("  - blocked, against trend   : ", g_blockedTrend);
   Print("  - entries attempted        : ", g_entriesAttempted);
   Print("  - entries actually opened  : ", g_entriesOpened);
   Print("=============================================================");
}
//+------------------------------------------------------------------+
