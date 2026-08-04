//+------------------------------------------------------------------+
//|                                               gold fast.mq5       |
//|                                                                    |
//| Fast M1 scalping Expert Advisor for XAUUSD (Gold) - MetaTrader 5. |
//|                                                                    |
//| Strategy summary (see numbered sections below for full spec):     |
//|   1. General settings / symbol / risk switches                    |
//|   2. Trading session filter (Istanbul time, GMT+3)                |
//|   3. Cumulative "doubling" lot-size table                         |
//|   4. Entry logic: M1 candle direction + EMA(9) position, on the   |
//|      close of a confirmed bar only (no repainting)                |
//|   5. Trade management: TP/SL/breakeven/trailing defined as a $    |
//|      price move (not broker points), then trailing stop           |
//|   6. Daily profit-target / max-loss circuit breaker               |
//|   7. Entry-blocking conditions (spread, sideways market, max      |
//|      concurrent trades, daily stops already hit)                  |
//|   8. Built-in statistics (win rate, avg win/loss, losing streak,  |
//|      drawdown) logged to the Experts tab and to a CSV file so the |
//|      EA can be evaluated after a Strategy Tester run.             |
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
// 2. TRADING SESSION (Istanbul time, GMT+3, no DST since 2016)
//====================================================================
input group "=== 2. Trading Session (Istanbul time) ==="
input int    InpSessionStartHour   = 11;         // Session start hour   (Istanbul, 24h)
input int    InpSessionStartMinute = 0;          // Session start minute (Istanbul)
input int    InpSessionEndHour     = 19;         // Session end hour     (Istanbul, 24h)
input int    InpSessionEndMinute   = 0;          // Session end minute   (Istanbul)
input int    InpIstanbulUtcOffset  = 3;          // Istanbul UTC offset, hours (fixed +3)
input int    InpBrokerUtcOffset    = 0;          // Broker/server time UTC offset, hours - SET THIS per your broker!

//====================================================================
// 3. LOT SIZING (MONEY MANAGEMENT) - cumulative doubling table
//====================================================================
input group "=== 3. Lot Sizing Table ==="
input bool   InpUseLotTable        = true;       // true = use balance table below, false = always use InpFixedLot
input double InpFixedLot           = 0.01;       // Lot used when InpUseLotTable = false
input string InpLotTableBalances   = "50,100,200,400,800,1600,3200,6400,12800,25600"; // Balance thresholds ($), ascending, comma separated
input string InpLotTableLots       = "0.01,0.02,0.04,0.08,0.16,0.32,0.64,1.28,2.56,5.12"; // Lot for each threshold above (same order/count)

//====================================================================
// 4. ENTRY LOGIC (M1 candle direction + EMA9) - no other filters/timeframes
//====================================================================
input group "=== 4. Entry Logic (M1, EMA) ==="
input int    InpEmaPeriod          = 9;          // EMA period, applied to M1 close price

//====================================================================
// 5. TRADE MANAGEMENT
//====================================================================
input group "=== 5. Trade Management ==="
input double InpTakeProfitUSD       = 1.30;      // Take profit, $ price move (price +$1.30 in your favor closes the trade)
input double InpStopLossUSD         = 1.30;      // Stop loss, $ price move (price -$1.30 against you closes the trade) - same $1.30 on both buy and sell
input double InpBreakevenTriggerUSD = 0.50;      // Profit, $ price move, that triggers moving SL to the entry price
input double InpBreakevenLockUSD    = 0.0;       // $ of extra profit locked in at breakeven (0 = exactly the entry price, as requested)
input double InpTrailingStopUSD     = 0.60;      // Trailing stop distance, $ price move (active only after breakeven has fired)
input double InpTrailingStepUSD     = 0.10;      // Minimum improvement, $ price move, required before the trailing SL is moved again

//====================================================================
// 6. DAILY PROFIT / LOSS CIRCUIT BREAKER
//====================================================================
input group "=== 6. Daily Profit / Loss Rules ==="
input double InpDailyProfitTargetPct = 20.0;     // Daily profit target, % of the day's starting equity -> close all & stop for the day
input double InpDailyMaxLossPct      = 10.0;     // Daily max loss, % of the day's starting equity -> close all & stop for the day

//====================================================================
// 7. ENTRY BLOCKING CONDITIONS
//====================================================================
input group "=== 7. Entry Filters ==="
input int    InpMaxSpreadPoints    = 50;         // Max allowed spread, points - blocks new entries above this
input int    InpMaxOpenTrades      = 1;          // Max simultaneously open trades opened by this EA
input int    InpRangeAvgBars       = 20;         // Bars used to compute the average range (sideways-market filter)
input double InpMinBodyRatio       = 0.30;       // Min candle-body / average-range ratio required to accept a signal

//====================================================================
// 8. STATISTICS / LOGGING (for backtest evaluation)
//====================================================================
input group "=== 8. Statistics / Logging ==="
input bool   InpPrintStatsOnDeinit = true;       // Print performance summary to the Experts log when EA is removed
input bool   InpWriteCsvLog        = true;       // Write a per-trade CSV log (win/loss, profit)
input string InpCsvFileName        = "GoldScalpingM1_EA_trades.csv"; // CSV file name, saved under MQL5\Files

input group "=== Debug ==="
input bool   InpVerboseLogging     = false;      // Print the reason every time a potential entry is blocked

//====================================================================
// GLOBAL STATE
//====================================================================
CTrade   trade;                    // trading wrapper
int      g_emaHandle = INVALID_HANDLE;
datetime g_lastBarTime = 0;        // time of the last M1 bar we already evaluated (new-bar detector)

// --- daily circuit breaker state -----------------------------------
string   g_lastResetDateKey = "";  // "YYYY.MM.DD" of the last day the daily counters were reset
double   g_dailyStartEquity = 0;   // equity at the start of the current trading day (11:00 Istanbul)
bool     g_dailyProfitHit   = false;
bool     g_dailyLossHit     = false;

// --- drawdown tracking ----------------------------------------------
double   g_peakEquity     = 0;
double   g_maxDrawdownPct = 0;

// --- parsed lot table -------------------------------------------------
double   g_lotTableBalances[];
double   g_lotTableLots[];
int      g_lotTableCount = 0;

// --- trade statistics (section 8) --------------------------------------
int      g_totalClosedTrades = 0;
int      g_wins   = 0;
int      g_losses = 0;
double   g_sumWinProfit  = 0;
double   g_sumLossProfit = 0;   // stored as a negative number
int      g_curLossStreak = 0;
int      g_maxLossStreak = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                    |
//+------------------------------------------------------------------+
int OnInit()
{
   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints((ulong)InpSlippagePoints);

   // EMA(9) on M1 close - the only indicator this strategy uses
   g_emaHandle = iMA(_Symbol, PERIOD_M1, InpEmaPeriod, 0, MODE_EMA, PRICE_CLOSE);
   if(g_emaHandle == INVALID_HANDLE)
   {
      Print("Failed to create EMA(", InpEmaPeriod, ") indicator handle. Error: ", GetLastError());
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
   g_lastResetDateKey  = "";
   g_dailyStartEquity  = AccountInfoDouble(ACCOUNT_EQUITY);
   g_dailyProfitHit    = false;
   g_dailyLossHit      = false;
   g_peakEquity        = AccountInfoDouble(ACCOUNT_EQUITY);
   g_maxDrawdownPct    = 0;

   g_totalClosedTrades = 0; g_wins = 0; g_losses = 0;
   g_sumWinProfit = 0; g_sumLossProfit = 0;
   g_curLossStreak = 0; g_maxLossStreak = 0;

   // Start each run (e.g. each Strategy Tester pass) with a fresh CSV log.
   if(InpWriteCsvLog && FileIsExist(InpCsvFileName))
      FileDelete(InpCsvFileName);

   if(StringFind(_Symbol, "XAU") < 0)
      Print("WARNING: chart symbol '", _Symbol, "' does not look like Gold (XAU...). ",
            "This EA is designed for XAUUSD.");

   Print("GoldScalpingM1_EA initialized on ", _Symbol, " M1. Session ",
         InpSessionStartHour, ":", InpSessionStartMinute, " - ",
         InpSessionEndHour, ":", InpSessionEndMinute, " Istanbul time.");

   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                  |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   if(g_emaHandle != INVALID_HANDLE)
      IndicatorRelease(g_emaHandle);

   if(InpPrintStatsOnDeinit)
      PrintStatistics();
}

//+------------------------------------------------------------------+
//| Expert tick function                                              |
//+------------------------------------------------------------------+
void OnTick()
{
   // 6. Roll the daily counters over at the 11:00 Istanbul session boundary.
   UpdateDailyReset();

   // Keep a running equity high-water-mark / drawdown reading (section 8).
   UpdateDrawdownStats();

   // Position management (breakeven + trailing stop) always runs, even
   // outside the trading session and even after the daily stop has fired -
   // open trades must still be protected (spec section 2 & 6).
   ManagePositions();

   // 6. Daily profit-target / max-loss circuit breaker.
   CheckDailyStops();

   // Only look for a new entry once per confirmed M1 bar close - never
   // intra-bar, so the signal never repaints.
   if(!IsNewBar())
      return;

   if(g_dailyProfitHit || g_dailyLossHit)
      return; // 6 & 7. today's stop already hit - no more entries today

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
   }

   if(InpWriteCsvLog)
      LogTradeToCsv(trans.deal, profit);
}

//+------------------------------------------------------------------+
//| Custom optimization/backtest criterion (section 8): profit per    |
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
// SECTION 4: ENTRY LOGIC
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
//| Runs every entry-blocking check (section 7) and, if all pass,     |
//| evaluates the section-4 candle/EMA signal and opens a trade.      |
//+------------------------------------------------------------------+
void TryOpenNewTrade()
{
   datetime ist = GetIstanbulTime();

   // 7. Trade only within the configured session window.
   if(!IsWithinSession(ist))
   {
      if(InpVerboseLogging) Print("Blocked: outside trading session (Istanbul ", TimeToString(ist, TIME_MINUTES), ")");
      return;
   }

   // 7. Spread filter.
   long spreadPts = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   if(spreadPts > InpMaxSpreadPoints)
   {
      if(InpVerboseLogging) Print("Blocked: spread ", spreadPts, " > max ", InpMaxSpreadPoints);
      return;
   }

   // 7. Max concurrent open trades (this EA only).
   if(CountOpenPositions() >= InpMaxOpenTrades)
   {
      if(InpVerboseLogging) Print("Blocked: max open trades (", InpMaxOpenTrades, ") reached");
      return;
   }

   // Need enough history for the sideways-market average-range filter and the EMA.
   if(Bars(_Symbol, PERIOD_M1) < InpRangeAvgBars + 3)
      return;

   // The just-closed M1 candle (shift 1) - the current bar (shift 0) is still forming.
   double open1  = iOpen(_Symbol, PERIOD_M1, 1);
   double close1 = iClose(_Symbol, PERIOD_M1, 1);

   // EMA(9) value aligned to that same closed candle.
   double emaBuf[];
   ArraySetAsSeries(emaBuf, true);
   if(CopyBuffer(g_emaHandle, 0, 1, 1, emaBuf) != 1)
      return;
   double ema1 = emaBuf[0];

   // 7. Sideways / no-clear-direction filter.
   if(IsSidewaysMarket(open1, close1))
   {
      if(InpVerboseLogging) Print("Blocked: sideways market (candle body too small vs average range)");
      return;
   }

   // 4. Core entry signal - pure M1 candle direction + EMA9 position, nothing else.
   bool bullishCandle = (close1 > open1);
   bool bearishCandle = (close1 < open1);

   bool buySignal  = bullishCandle && (close1 > ema1);
   bool sellSignal = bearishCandle && (close1 < ema1);

   if(!buySignal && !sellSignal)
      return; // no valid signal on this bar

   double lot = GetLotSize();

   // TP/SL are a straight $ price offset (XAUUSD quotes directly in USD per
   // ounce), not a points/digits count - so no broker point-size conversion
   // is needed here: a $13.00 target is the same $13.00 on every broker.
   if(buySignal)
   {
      double price = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double sl    = NormalizeDouble(price - InpStopLossUSD, _Digits);
      double tp    = NormalizeDouble(price + InpTakeProfitUSD, _Digits);
      if(!trade.Buy(lot, _Symbol, price, sl, tp, "GoldScalpM1 buy"))
         Print("Buy order failed. Error: ", GetLastError());
   }
   else // sellSignal
   {
      double price = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double sl    = NormalizeDouble(price + InpStopLossUSD, _Digits);
      double tp    = NormalizeDouble(price - InpTakeProfitUSD, _Digits);
      if(!trade.Sell(lot, _Symbol, price, sl, tp, "GoldScalpM1 sell"))
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
// SECTION 5: TRADE MANAGEMENT (breakeven + trailing stop)
//====================================================================

//+------------------------------------------------------------------+
//| Applies breakeven and trailing-stop logic to every open position  |
//| belonging to this EA on this symbol. Runs on every tick,          |
//| independent of the trading session, so open trades stay protected |
//| even outside 11:00-19:00 Istanbul.                                |
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
// SECTION 3: LOT SIZING
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
// SECTION 6: DAILY PROFIT / LOSS CIRCUIT BREAKER
//====================================================================

//+------------------------------------------------------------------+
//| Resets the daily start-of-day equity and the daily hit-flags      |
//| exactly once, on the first tick after the session start time      |
//| (11:00 Istanbul by default) on each new calendar day.             |
//+------------------------------------------------------------------+
void UpdateDailyReset()
{
   datetime ist = GetIstanbulTime();
   MqlDateTime dt;
   TimeToStruct(ist, dt);

   int curMin   = dt.hour * 60 + dt.min;
   int startMin = InpSessionStartHour * 60 + InpSessionStartMinute;
   string todayKey = StringFormat("%04d.%02d.%02d", dt.year, dt.mon, dt.day);

   if(curMin >= startMin && todayKey != g_lastResetDateKey)
   {
      g_lastResetDateKey = todayKey;
      g_dailyStartEquity = AccountInfoDouble(ACCOUNT_EQUITY);
      g_dailyProfitHit   = false;
      g_dailyLossHit     = false;
      Print("New trading day started (Istanbul ", TimeToString(ist, TIME_DATE | TIME_MINUTES),
            "). Day-start equity = ", DoubleToString(g_dailyStartEquity, 2));
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
// SECTION 2: SESSION / TIME HELPERS
//====================================================================

//+------------------------------------------------------------------+
//| Converts the broker/server clock (TimeCurrent) into Istanbul      |
//| local time using the two UTC-offset inputs. Istanbul has been on  |
//| a fixed UTC+3 (no DST) since 2016.                                 |
//+------------------------------------------------------------------+
datetime GetIstanbulTime()
{
   return TimeCurrent() + (InpIstanbulUtcOffset - InpBrokerUtcOffset) * 3600;
}

//+------------------------------------------------------------------+
//| True if the given Istanbul time falls inside the configured       |
//| trading session window [start, end).                              |
//+------------------------------------------------------------------+
bool IsWithinSession(datetime ist)
{
   MqlDateTime dt;
   TimeToStruct(ist, dt);
   int curMin   = dt.hour * 60 + dt.min;
   int startMin = InpSessionStartHour * 60 + InpSessionStartMinute;
   int endMin   = InpSessionEndHour   * 60 + InpSessionEndMinute;
   return (curMin >= startMin && curMin < endMin);
}

//+------------------------------------------------------------------+
//| Tracks the running equity high-water-mark and the resulting max   |
//| drawdown percentage, for the section-8 performance summary.       |
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
// SECTION 8: STATISTICS / LOGGING
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
//| Prints the section-8 performance summary to the Experts log:      |
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
}
//+------------------------------------------------------------------+
