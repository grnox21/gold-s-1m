//+------------------------------------------------------------------+
//|                                     GoldLiquiditySweepEA.mq5      |
//|                                                                    |
//| Strategy : Liquidity Sweep + M1 Reversal                          |
//|   1. Find a recent swing high/low (liquidity pool) on M5/M15.     |
//|   2. Wait for price to sweep beyond that swing point (wick or     |
//|      brief break past it).                                        |
//|   3. Enter only after an M1 candle closes back inside the range,  |
//|      in the direction of the higher-timeframe trend (EMA200 M15). |
//|   4. Stop loss just beyond the swept point (variable distance).   |
//|   5. Take profit = same distance as stop loss (1:1 R:R).          |
//|                                                                    |
//| Built for a small ($100) XAUUSD account -> risk management is the |
//| centerpiece of this EA, not an afterthought. Read the comments    |
//| in every Risk-Management function before changing any inputs.    |
//|                                                                    |
//| IMPORTANT: This EA has NOT been backtested by the author of this  |
//| source file (no MetaTrader 5 terminal / broker feed is available  |
//| in the environment that generated this code). See docs/BACKTEST- |
//| ING.md for the mandatory 1-year M1 validation procedure that MUST |
//| be run in the MT5 Strategy Tester before any live or demo use.    |
//+------------------------------------------------------------------+
#property copyright "Gold Liquidity Sweep EA"
#property version   "1.00"
#property description "Liquidity sweep + M1 reversal EA for XAUUSD, with equity-% risk sizing, daily/consecutive-loss/account circuit breakers, an Istanbul trading window, and a high-impact USD news filter."

#include <Trade\Trade.mqh>

CTrade trade;

//====================================================================
// INPUTS
//====================================================================
input group "=== Strategy / Setup ===";
input ENUM_TIMEFRAMES SwingTimeframe        = PERIOD_M15;  // Timeframe used to locate the liquidity pool (swing high/low)
input int             SwingLookbackBars     = 30;          // How many bars back to search for a swing pivot
input int             SwingLeftRight        = 2;           // Bars required on each side of a pivot to confirm it as a swing (fractal-style)
input ENUM_TIMEFRAMES TrendTimeframe        = PERIOD_M15;  // Timeframe for the EMA200 trend filter
input int             TrendEMAPeriod        = 200;         // EMA period for the higher-timeframe trend filter
input int             SweepLookbackM1Bars   = 5;           // How many recent closed M1 bars to scan for a sweep of the swing point
input int             ReversalMinBodyPercent= 40;          // Minimum body-to-range % for a candle to qualify as a valid M1 reversal candle
input double          StopBufferPoints      = 20;          // Extra buffer (points) placed beyond the swept wick for the SL

input group "=== Risk Management (see comments in each function) ===";
input double RiskPercentPerTrade         = 1.5;   // % of CURRENT EQUITY risked per trade
input double DailyProfitTargetPercent    = 6.0;   // Stop opening new trades once the day is up this % (from day-start equity)
input double DailyLossCapPercent         = 5.0;   // Stop opening new trades once the day is down this % (from day-start equity)
input int    MaxConsecutiveLosses        = 3;     // Stop opening new trades after this many losers in a row, same day
input double AccountCircuitBreakerPercent= 30.0;  // If equity falls this % below the ORIGINAL account starting balance, disable ALL new trading (manual reset only)
input bool   ResetAccountCircuitBreaker  = false;  // Set to true + reload EA to manually clear a tripped account circuit breaker, then set back to false

input group "=== Trading Window (Istanbul time, GMT+3, no DST) ===";
input int SessionStartHour = 11;  // Inclusive
input int SessionEndHour   = 19;  // Exclusive - no NEW entries at/after this hour
input int BrokerToUTCOffsetHours = 3; // Your broker/server clock's offset from UTC (e.g. server=UTC+3 -> 3, server=UTC -> 0).
                                       // MUST be set correctly for your broker or the session window will be wrong (this
                                       // is what caused zero trades before the fix: TimeGMT() is unreliable/returns 0 in
                                       // the Strategy Tester, so Istanbul time is now derived from TimeCurrent() + this
                                       // offset instead, which works both live and in backtests). Check your broker's
                                       // server-time spec; some brokers shift this by 1h with their own DST twice a year.

input group "=== Diagnostics ===";
input bool LogSkipReasons = false; // Print why an entry was skipped each M1 bar (useful for diagnosing zero-trade runs)

input group "=== News Filter (uses MT5 built-in Economic Calendar) ===";
input bool UseNewsFilter      = true; // Block new trades around high-impact USD news
input int  NewsBufferMinutes  = 30;   // Minutes before/after a news event during which new trades are blocked

input group "=== Trade Execution ===";
input int    MagicNumber       = 20260805;
input string TradeComment      = "LiqSweepEA";
input bool   OnePositionAtATime= true;   // Do not open a new trade while one is already open for this symbol/magic
input int    MaxSpreadPoints   = 350;    // Safety guard: skip entries if current spread exceeds this many points
input int    SlippagePoints    = 30;     // Max allowed slippage on market entry

//====================================================================
// GLOBAL STATE
//====================================================================
int      g_emaHandle = INVALID_HANDLE;

datetime g_lastM1Time    = 0;
datetime g_lastSwingTime = 0;

double   g_swingHigh = 0.0;
double   g_swingLow  = 0.0;

// --- Daily risk-manager state ---
datetime g_currentDay        = 0;      // Istanbul-time day marker (start-of-day timestamp)
double   g_dayStartEquity    = 0.0;
double   g_dayStartBalance   = 0.0;
bool     g_dailyTradingDisabled = false;

// --- Consecutive-loss circuit breaker state ---
int      g_consecutiveLosses = 0;

// --- Account-level circuit breaker state (persists across restarts via GlobalVariables) ---
double   g_accountStartBalance       = 0.0;
bool     g_accountCircuitBreakerTriggered = false;

// --- Statistics counters, printed/exported in OnTester() for the backtest report ---
int      g_statDailyProfitTargetHits      = 0;
int      g_statDailyLossCapHits           = 0;
int      g_statConsecutiveLossBreakerHits = 0;
bool     g_statAccountBreakerTriggered    = false;
datetime g_statAccountBreakerTime         = 0;

#define TREND_UP   1
#define TREND_DOWN -1
#define TREND_NONE 0

//====================================================================
// UTILITY: unique key per symbol+magic, used for persistent GlobalVariables
//====================================================================
string BaseGlobalVarKey()
{
   return "GoldLiqSweepEA_" + _Symbol + "_" + IntegerToString(MagicNumber);
}

//====================================================================
// OnInit
//====================================================================
int OnInit()
{
   trade.SetExpertMagicNumber(MagicNumber);
   trade.SetDeviationInPoints(SlippagePoints);
   trade.SetTypeFillingBySymbol(_Symbol);

   g_emaHandle = iMA(_Symbol, TrendTimeframe, TrendEMAPeriod, 0, MODE_EMA, PRICE_CLOSE);
   if(g_emaHandle == INVALID_HANDLE)
   {
      Print("GoldLiquiditySweepEA: failed to create EMA indicator handle. Error=", GetLastError());
      return INIT_FAILED;
   }

   // --- Persist the ORIGINAL account starting balance across EA reloads/restarts. ---
   // This is what the -30% account-level circuit breaker measures against, so it must
   // NOT silently reset every time the EA is re-attached (that would defeat the breaker).
   string balKey = BaseGlobalVarKey() + "_StartBalance";
   if(GlobalVariableCheck(balKey))
      g_accountStartBalance = GlobalVariableGet(balKey);
   else
   {
      g_accountStartBalance = AccountInfoDouble(ACCOUNT_BALANCE);
      GlobalVariableSet(balKey, g_accountStartBalance);
   }

   // --- Load / manually reset the account circuit-breaker flag. ---
   string cbKey = BaseGlobalVarKey() + "_CircuitBreaker";
   if(ResetAccountCircuitBreaker)
   {
      GlobalVariableDel(cbKey);
      g_accountCircuitBreakerTriggered = false;
      Print("GoldLiquiditySweepEA: account circuit breaker manually RESET by operator input. ",
            "Set ResetAccountCircuitBreaker back to false after this reload.");
   }
   else if(GlobalVariableCheck(cbKey))
   {
      g_accountCircuitBreakerTriggered = (GlobalVariableGet(cbKey) >= 1.0);
      if(g_accountCircuitBreakerTriggered)
         Print("GoldLiquiditySweepEA: account circuit breaker is ACTIVE from a previous session. ",
               "No new trades will be opened until manually re-enabled.");
   }

   g_currentDay = 0; // force DailyRiskManager() to (re)initialize day-start equity on first tick

   Print("GoldLiquiditySweepEA initialized. Account start-balance reference = ", g_accountStartBalance);
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   if(g_emaHandle != INVALID_HANDLE)
      IndicatorRelease(g_emaHandle);
}

//====================================================================
// OnTick - main loop
//====================================================================
void OnTick()
{
   // Risk-management housekeeping runs every tick regardless of new bars,
   // so daily/account circuit breakers react as fast as possible.
   DailyRiskManager();
   CheckAccountCircuitBreaker();

   if(!IsNewM1Bar())
      return; // sweep/reversal detection & entries are evaluated once per closed M1 bar

   MaybeUpdateSwingPoints();

   // ---- Entry gating (all of these only block NEW entries; existing positions
   //      keep their broker-side SL/TP and are managed regardless) ----
   if(g_accountCircuitBreakerTriggered)
   {
      if(LogSkipReasons) Print("Skip: account circuit breaker is active.");
      return; // account-level breaker: no auto-resume, ever
   }

   if(g_dailyTradingDisabled)
   {
      if(LogSkipReasons) Print("Skip: daily trading disabled (profit target / loss cap / consecutive-loss breaker).");
      return; // daily profit target / loss cap / consecutive-loss breaker already hit today
   }

   if(OnePositionAtATime && PositionSelect(_Symbol))
   {
      if(LogSkipReasons) Print("Skip: a position is already open (OnePositionAtATime=true).");
      return;
   }

   if(!TradingWindowFilter())
   {
      if(LogSkipReasons)
      {
         MqlDateTime dbg; TimeToStruct(GetIstanbulTime(), dbg);
         Print("Skip: outside trading window. Computed Istanbul hour=", dbg.hour,
               " (window is ", SessionStartHour, "-", SessionEndHour, "). ",
               "If this looks wrong, check BrokerToUTCOffsetHours against your broker's server time.");
      }
      return; // outside 11:00-19:00 Istanbul time
   }

   if(NewsFilter())
   {
      if(LogSkipReasons) Print("Skip: inside a high-impact USD news blackout window.");
      return; // inside a high-impact USD news blackout window
   }

   int trend = GetTrendFilter();
   if(trend == TREND_NONE)
   {
      if(LogSkipReasons) Print("Skip: no trend (price == EMA200 or EMA/price unavailable).");
      return;
   }

   double sweptLevel = 0.0, sweepExtreme = 0.0;
   datetime sweepBarTime = 0;

   if(trend == TREND_UP)
   {
      // Uptrend -> only buy-side sweeps: liquidity taken BELOW a swing low, then reclaimed.
      if(DetectLiquiditySweep(TREND_UP, sweptLevel, sweepExtreme, sweepBarTime) &&
         DetectM1ReversalCandle(TREND_UP, sweptLevel))
      {
         TryEnterTrade(ORDER_TYPE_BUY, sweepExtreme);
      }
      else if(LogSkipReasons)
         Print("Skip: uptrend, no confirmed buy-side sweep+reversal this bar. swingLow=", g_swingLow);
   }
   else if(trend == TREND_DOWN)
   {
      // Downtrend -> only sell-side sweeps: liquidity taken ABOVE a swing high, then rejected.
      if(DetectLiquiditySweep(TREND_DOWN, sweptLevel, sweepExtreme, sweepBarTime) &&
         DetectM1ReversalCandle(TREND_DOWN, sweptLevel))
      {
         TryEnterTrade(ORDER_TYPE_SELL, sweepExtreme);
      }
      else if(LogSkipReasons)
         Print("Skip: downtrend, no confirmed sell-side sweep+reversal this bar. swingHigh=", g_swingHigh);
   }
}

//====================================================================
// New-bar helpers
//====================================================================
bool IsNewM1Bar()
{
   datetime t = iTime(_Symbol, PERIOD_M1, 0);
   if(t != g_lastM1Time)
   {
      g_lastM1Time = t;
      return true;
   }
   return false;
}

bool IsNewSwingBar()
{
   datetime t = iTime(_Symbol, SwingTimeframe, 0);
   if(t != g_lastSwingTime)
   {
      g_lastSwingTime = t;
      return true;
   }
   return false;
}

//====================================================================
// Swing (liquidity pool) detection - fractal-style pivot on SwingTimeframe
//====================================================================
bool FindLastSwingHigh(double &level, datetime &barTime)
{
   int need = SwingLookbackBars + SwingLeftRight * 2 + 2;
   double highs[];
   ArraySetAsSeries(highs, true);
   if(CopyHigh(_Symbol, SwingTimeframe, 0, need, highs) < need)
      return false;

   for(int i = 1 + SwingLeftRight; i <= SwingLookbackBars; i++)
   {
      bool isPivot = true;
      for(int j = 1; j <= SwingLeftRight; j++)
      {
         if(highs[i - j] > highs[i] || highs[i + j] > highs[i])
         {
            isPivot = false;
            break;
         }
      }
      if(isPivot)
      {
         level = highs[i];
         datetime t[];
         ArraySetAsSeries(t, true);
         if(CopyTime(_Symbol, SwingTimeframe, i, 1, t) == 1)
            barTime = t[0];
         return true;
      }
   }
   return false;
}

bool FindLastSwingLow(double &level, datetime &barTime)
{
   int need = SwingLookbackBars + SwingLeftRight * 2 + 2;
   double lows[];
   ArraySetAsSeries(lows, true);
   if(CopyLow(_Symbol, SwingTimeframe, 0, need, lows) < need)
      return false;

   for(int i = 1 + SwingLeftRight; i <= SwingLookbackBars; i++)
   {
      bool isPivot = true;
      for(int j = 1; j <= SwingLeftRight; j++)
      {
         if(lows[i - j] < lows[i] || lows[i + j] < lows[i])
         {
            isPivot = false;
            break;
         }
      }
      if(isPivot)
      {
         level = lows[i];
         datetime t[];
         ArraySetAsSeries(t, true);
         if(CopyTime(_Symbol, SwingTimeframe, i, 1, t) == 1)
            barTime = t[0];
         return true;
      }
   }
   return false;
}

void MaybeUpdateSwingPoints()
{
   if(!IsNewSwingBar())
      return;

   double h, l;
   datetime th, tl;
   if(FindLastSwingHigh(h, th))
      g_swingHigh = h;
   if(FindLastSwingLow(l, tl))
      g_swingLow = l;
}

//====================================================================
// DetectLiquiditySweep()
// Scans the last N closed M1 bars for a wick that pierced beyond the
// current swing high/low (the "liquidity pool"). Returns the level that
// was swept and the actual wick extreme reached (used later for the SL).
// direction: TREND_UP   -> looking for a sweep BELOW g_swingLow (buy-side)
//            TREND_DOWN -> looking for a sweep ABOVE g_swingHigh (sell-side)
//====================================================================
bool DetectLiquiditySweep(int direction, double &sweptLevel, double &sweepExtreme, datetime &sweepBarTime)
{
   if(g_swingHigh <= 0.0 || g_swingLow <= 0.0)
      return false;

   double level = (direction == TREND_UP) ? g_swingLow : g_swingHigh;

   int need = SweepLookbackM1Bars + 1;
   double h[], l[];
   datetime t[];
   ArraySetAsSeries(h, true);
   ArraySetAsSeries(l, true);
   ArraySetAsSeries(t, true);

   if(CopyHigh(_Symbol, PERIOD_M1, 0, need, h) < need) return false;
   if(CopyLow(_Symbol, PERIOD_M1, 0, need, l)  < need) return false;
   if(CopyTime(_Symbol, PERIOD_M1, 0, need, t) < need) return false;

   for(int i = 1; i <= SweepLookbackM1Bars; i++)
   {
      if(direction == TREND_UP && l[i] < level)
      {
         sweptLevel   = level;
         sweepExtreme = l[i];      // lowest wick point of the sweep -> beyond this = SL
         sweepBarTime = t[i];
         return true;
      }
      if(direction == TREND_DOWN && h[i] > level)
      {
         sweptLevel   = level;
         sweepExtreme = h[i];      // highest wick point of the sweep -> beyond this = SL
         sweepBarTime = t[i];
         return true;
      }
   }
   return false;
}

//====================================================================
// DetectM1ReversalCandle()
// Checks the most recently CLOSED M1 candle for a valid reversal:
//  - it must close back INSIDE the range (beyond the swept level, on the
//    "safe" side again), confirming the sweep was a stop-hunt, not a
//    genuine breakout;
//  - it must close in the direction of the trade (bullish for buys,
//    bearish for sells);
//  - its body must be a meaningful fraction of its range (filters out
//    indecision/doji bars that don't represent real reversal pressure).
//====================================================================
bool DetectM1ReversalCandle(int direction, double sweptLevel)
{
   double o[], h[], l[], c[];
   ArraySetAsSeries(o, true);
   ArraySetAsSeries(h, true);
   ArraySetAsSeries(l, true);
   ArraySetAsSeries(c, true);

   if(CopyOpen(_Symbol, PERIOD_M1, 0, 2, o) < 2)  return false;
   if(CopyHigh(_Symbol, PERIOD_M1, 0, 2, h) < 2)  return false;
   if(CopyLow(_Symbol, PERIOD_M1, 0, 2, l)  < 2)  return false;
   if(CopyClose(_Symbol, PERIOD_M1, 0, 2, c) < 2) return false;

   double open  = o[1];
   double high  = h[1];
   double low   = l[1];
   double close = c[1];

   double range = high - low;
   if(range <= 0.0)
      return false;

   double body    = MathAbs(close - open);
   double bodyPct = body / range * 100.0;
   if(bodyPct < ReversalMinBodyPercent)
      return false; // too indecisive to count as a reversal candle

   if(direction == TREND_UP)
      return (close > open && close > sweptLevel); // bullish candle, closed back above the swept low
   if(direction == TREND_DOWN)
      return (close < open && close < sweptLevel); // bearish candle, closed back below the swept high

   return false;
}

//====================================================================
// GetTrendFilter()
// Higher-timeframe (M15) EMA200 trend filter.
//   price above EMA200 -> TREND_UP   -> only buy-side sweeps are traded
//   price below EMA200 -> TREND_DOWN -> only sell-side sweeps are traded
//====================================================================
int GetTrendFilter()
{
   double emaBuf[];
   ArraySetAsSeries(emaBuf, true);
   if(CopyBuffer(g_emaHandle, 0, 0, 1, emaBuf) < 1)
      return TREND_NONE;

   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   if(bid <= 0.0 || ask <= 0.0)
      return TREND_NONE;

   double price = (bid + ask) / 2.0;

   if(price > emaBuf[0]) return TREND_UP;
   if(price < emaBuf[0]) return TREND_DOWN;
   return TREND_NONE;
}

//====================================================================
// TradingWindowFilter()
// Only new entries are gated by the session window; already-open trades
// keep their broker-side SL/TP and continue to be managed 24/7.
// Istanbul (Turkey) has been fixed at GMT+3 year-round since 2016
// (no DST), so we don't need any seasonal offset logic on the Istanbul
// side. We DO need the broker's UTC offset, however - and deliberately
// do NOT use TimeGMT() for that: TimeGMT() depends on a live GMT sync
// that is not available against historical data, so in the Strategy
// Tester it returns 0 the entire run. That silently made this filter
// permanently false (a fixed, wrong hour never inside the session),
// which is exactly what caused a full-year backtest to take zero
// trades. TimeCurrent() (the broker/server clock) is reliable in both
// live trading and the tester, so we derive Istanbul time from that
// plus the user-supplied BrokerToUTCOffsetHours input instead.
//====================================================================
datetime GetIstanbulTime()
{
   datetime utc = TimeCurrent() - BrokerToUTCOffsetHours * 3600;
   return utc + 3 * 3600;
}

bool TradingWindowFilter()
{
   datetime ist = GetIstanbulTime();
   MqlDateTime dt;
   TimeToStruct(ist, dt);

   if(SessionStartHour <= SessionEndHour)
      return (dt.hour >= SessionStartHour && dt.hour < SessionEndHour);

   // supports a window that wraps past midnight, just in case
   return (dt.hour >= SessionStartHour || dt.hour < SessionEndHour);
}

//====================================================================
// NewsFilter()
// Blocks NEW trades 30 minutes before/after US rate decisions, CPI, NFP
// and Fed speeches/announcements, using MT5's built-in Economic Calendar.
//
// NOTE: this relies on the terminal's Economic Calendar being populated
// (live trading: requires the "Calendar" feature enabled & an internet
// connection; Strategy Tester: requires a build/terminal with historical
// calendar support for backtesting). If the calendar call fails or
// returns no data we FAIL OPEN (do not block) so a calendar outage can't
// silently freeze the EA forever - verify calendar availability with
// your broker/terminal before relying on this filter live.
//====================================================================
bool IsTargetNewsEvent(const string &nameUpper)
{
   // US rate decisions / FOMC
   if(StringFind(nameUpper, "FED FUNDS") >= 0)             return true;
   if(StringFind(nameUpper, "FEDERAL FUNDS") >= 0)         return true;
   if(StringFind(nameUpper, "INTEREST RATE DECISION") >= 0)return true;
   if(StringFind(nameUpper, "FOMC") >= 0)                  return true;
   if(StringFind(nameUpper, "RATE DECISION") >= 0)         return true;
   // CPI
   if(StringFind(nameUpper, "CPI") >= 0)                   return true;
   if(StringFind(nameUpper, "CONSUMER PRICE") >= 0)        return true;
   // NFP
   if(StringFind(nameUpper, "NONFARM") >= 0)               return true;
   if(StringFind(nameUpper, "NON-FARM") >= 0)              return true;
   if(StringFind(nameUpper, "NON FARM") >= 0)              return true;
   if(StringFind(nameUpper, "PAYROLL") >= 0)               return true;
   // Fed speeches / announcements
   if(StringFind(nameUpper, "FED CHAIR") >= 0)             return true;
   if(StringFind(nameUpper, "FED CHAIRMAN") >= 0)          return true;
   if(StringFind(nameUpper, "POWELL") >= 0)                return true;
   if(StringFind(nameUpper, "FOMC STATEMENT") >= 0)        return true;
   if(StringFind(nameUpper, "FOMC PRESS CONFERENCE") >= 0) return true;
   if(StringFind(nameUpper, "FED ") == 0 && StringFind(nameUpper, "SPEAK") >= 0) return true;
   if(StringFind(nameUpper, "SPEAKS") >= 0 && StringFind(nameUpper, "FED") >= 0) return true;
   if(StringFind(nameUpper, "SPEECH") >= 0 && StringFind(nameUpper, "FED") >= 0) return true;

   return false;
}

bool NewsFilter()
{
   if(!UseNewsFilter)
      return false;

   datetime now  = TimeCurrent();
   int      bufS = NewsBufferMinutes * 60;
   datetime from = now - bufS - 300; // small safety margin either side of the query window
   datetime to   = now + bufS + 300;

   MqlCalendarValue values[];
   int cnt = CalendarValueHistory(values, from, to, "US", NULL);
   if(cnt <= 0)
      return false; // no US events in window, or calendar unavailable -> fail open

   for(int i = 0; i < cnt; i++)
   {
      MqlCalendarEvent ev;
      if(!CalendarEventById(values[i].event_id, ev))
         continue;

      string nameUpper = ev.name;
      StringToUpper(nameUpper);

      // High-impact anything OR one of our explicitly targeted categories
      bool relevant = (ev.importance == CALENDAR_IMPORTANCE_HIGH) || IsTargetNewsEvent(nameUpper);
      if(!relevant)
         continue;

      long diffSec = (long)(now - values[i].time);
      if(MathAbs(diffSec) <= bufS)
      {
         Print("NewsFilter: blocking new entries, event='", ev.name, "' scheduled=", TimeToString(values[i].time));
         return true;
      }
   }
   return false;
}

//====================================================================
// CalculateDynamicLot()
// -------------------------------------------------------------------
// RISK RULE: risk exactly RiskPercentPerTrade % of CURRENT EQUITY on
// every trade, regardless of how far away the stop loss is.
//   lotSize = (equity * risk%) / (stopDistanceInPoints * pointValue)
// Lot is then rounded DOWN to the broker's lot step (never up - rounding
// up would silently risk more than intended). If the rounded lot would
// be smaller than the broker's minimum (0.01), we DO NOT force a 0.01
// lot trade (that could risk multiples of the intended %) - instead the
// trade is skipped. On a $100 account this can happen when the stop
// distance is unusually wide; it is a feature, not a bug.
//====================================================================
double CalculateDynamicLot(double stopDistancePoints)
{
   if(stopDistancePoints <= 0.0)
      return 0.0;

   double equity     = AccountInfoDouble(ACCOUNT_EQUITY);
   double riskAmount = equity * (RiskPercentPerTrade / 100.0);

   double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   double tickSize  = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   double point     = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   if(tickSize <= 0.0 || point <= 0.0 || tickValue <= 0.0)
      return 0.0;

   // Monetary value of a 1-point move for 1.00 lot
   double pointValue = tickValue * (point / tickSize);
   if(pointValue <= 0.0)
      return 0.0;

   double rawLot = riskAmount / (stopDistancePoints * pointValue);

   double lotStep = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   double lotMin  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double lotMax  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   if(lotStep <= 0.0) lotStep = 0.01;
   if(lotMin  <= 0.0) lotMin  = 0.01;

   double lot = MathFloor(rawLot / lotStep) * lotStep; // ROUND DOWN to lot step

   if(lot < lotMin)
   {
      Print("CalculateDynamicLot: computed lot ", DoubleToString(rawLot, 4),
            " rounds below broker minimum ", DoubleToString(lotMin, 2),
            " for the requested risk of ", DoubleToString(RiskPercentPerTrade, 2),
            "% - skipping trade rather than over-risking.");
      return 0.0;
   }
   if(lot > lotMax)
      lot = lotMax;

   // Normalize decimals to the lot step's precision
   int decimals = 2;
   if(lotStep >= 1.0) decimals = 0;
   else if(lotStep >= 0.1) decimals = 1;
   else if(lotStep >= 0.01) decimals = 2;
   else decimals = 3;

   return NormalizeDouble(lot, decimals);
}

//====================================================================
// DailyRiskManager()
// -------------------------------------------------------------------
// RISK RULES:
//  - At the start of each new trading day (Istanbul time), record the
//    day's starting equity/balance and reset the daily flags/counters.
//  - Daily PROFIT TARGET: once equity is up DailyProfitTargetPercent %
//    from the day's starting equity, stop opening NEW trades for the
//    rest of the day. Existing trades keep running to their own SL/TP.
//  - Daily LOSS CAP: once equity is down DailyLossCapPercent % from the
//    day's starting equity, stop opening NEW trades for the rest of the
//    day (same "existing trades unaffected" behaviour).
//====================================================================
void DailyRiskManager()
{
   datetime ist = GetIstanbulTime();
   MqlDateTime dt;
   TimeToStruct(ist, dt);
   datetime istMidnight = ist - (dt.hour * 3600 + dt.min * 60 + dt.sec);

   if(istMidnight != g_currentDay)
   {
      g_currentDay          = istMidnight;
      g_dayStartEquity      = AccountInfoDouble(ACCOUNT_EQUITY);
      g_dayStartBalance     = AccountInfoDouble(ACCOUNT_BALANCE);
      g_dailyTradingDisabled= false;
      g_consecutiveLosses   = 0;
      Print("DailyRiskManager: new trading day. Day-start equity=", DoubleToString(g_dayStartEquity, 2));
   }

   if(g_dailyTradingDisabled || g_dayStartEquity <= 0.0)
      return;

   double equity    = AccountInfoDouble(ACCOUNT_EQUITY);
   double changePct = (equity - g_dayStartEquity) / g_dayStartEquity * 100.0;

   if(changePct >= DailyProfitTargetPercent)
   {
      g_dailyTradingDisabled = true;
      g_statDailyProfitTargetHits++;
      Print("DailyRiskManager: DAILY PROFIT TARGET reached (+", DoubleToString(changePct, 2),
            "% >= +", DoubleToString(DailyProfitTargetPercent, 2), "%). No new trades until tomorrow.");
   }
   else if(changePct <= -DailyLossCapPercent)
   {
      g_dailyTradingDisabled = true;
      g_statDailyLossCapHits++;
      Print("DailyRiskManager: DAILY LOSS CAP breached (", DoubleToString(changePct, 2),
            "% <= -", DoubleToString(DailyLossCapPercent, 2), "%). No new trades until tomorrow.");
   }
}

//====================================================================
// ConsecutiveLossTracker()
// -------------------------------------------------------------------
// RISK RULE: after MaxConsecutiveLosses losing trades IN THE SAME DAY,
// stop opening new trades for the rest of the day - even if the daily
// loss cap in % terms hasn't been hit yet. A winning (or breakeven)
// trade resets the counter. Called from OnTradeTransaction() whenever
// a position belonging to this EA closes.
//====================================================================
void ConsecutiveLossTracker(double netProfit)
{
   if(netProfit < 0.0)
   {
      g_consecutiveLosses++;
      Print("ConsecutiveLossTracker: loss recorded. Consecutive losses today = ", g_consecutiveLosses);

      if(g_consecutiveLosses >= MaxConsecutiveLosses && !g_dailyTradingDisabled)
      {
         g_dailyTradingDisabled = true;
         g_statConsecutiveLossBreakerHits++;
         Print("ConsecutiveLossTracker: CIRCUIT BREAKER - ", g_consecutiveLosses,
               " consecutive losses. No new trades until tomorrow.");
      }
   }
   else
   {
      if(g_consecutiveLosses > 0)
         Print("ConsecutiveLossTracker: winning/breakeven trade - consecutive loss counter reset.");
      g_consecutiveLosses = 0;
   }
}

//====================================================================
// CheckAccountCircuitBreaker()
// -------------------------------------------------------------------
// RISK RULE: if equity ever falls AccountCircuitBreakerPercent % below
// the account's ORIGINAL starting balance, disable ALL new trading
// permanently - there is NO automatic resume. The only way out is a
// human setting ResetAccountCircuitBreaker=true and reloading the EA.
// The tripped state is persisted via a terminal GlobalVariable so it
// survives EA/terminal restarts.
//====================================================================
void CheckAccountCircuitBreaker()
{
   if(g_accountCircuitBreakerTriggered)
      return; // already tripped - stays tripped until a human resets it

   if(g_accountStartBalance <= 0.0)
      return;

   double equity        = AccountInfoDouble(ACCOUNT_EQUITY);
   double drawdownPct   = (g_accountStartBalance - equity) / g_accountStartBalance * 100.0;

   if(drawdownPct >= AccountCircuitBreakerPercent)
   {
      g_accountCircuitBreakerTriggered = true;
      g_statAccountBreakerTriggered    = true;
      g_statAccountBreakerTime         = TimeCurrent();

      GlobalVariableSet(BaseGlobalVarKey() + "_CircuitBreaker", 1.0);

      string msg = StringFormat(
         "ACCOUNT CIRCUIT BREAKER TRIGGERED: equity %.2f is %.2f%% below starting balance %.2f (threshold %.2f%%). "
         "ALL new trading disabled until a human sets ResetAccountCircuitBreaker=true and reloads the EA.",
         equity, drawdownPct, g_accountStartBalance, AccountCircuitBreakerPercent);
      Alert(msg);
      Print(msg);
   }
}

//====================================================================
// TryEnterTrade()
// Builds SL/TP from the swept wick extreme (variable distance, NOT a
// fixed number of pips), sizes the position with CalculateDynamicLot(),
// and sends the market order.
//====================================================================
bool TryEnterTrade(ENUM_ORDER_TYPE orderType, double sweepExtreme)
{
   double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   int    digits= (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);

   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   if(bid <= 0.0 || ask <= 0.0)
      return false;

   // --- Spread safety guard ---
   double spreadPoints = (ask - bid) / point;
   if(spreadPoints > MaxSpreadPoints)
   {
      Print("TryEnterTrade: spread ", DoubleToString(spreadPoints, 1), " points exceeds MaxSpreadPoints (",
            MaxSpreadPoints, ") - skipping entry.");
      return false;
   }

   double entryPrice, sl, tp;

   if(orderType == ORDER_TYPE_BUY)
   {
      entryPrice = ask;
      sl = sweepExtreme - StopBufferPoints * point;   // just beyond the swept low
      double dist = entryPrice - sl;
      tp = entryPrice + dist;                          // 1:1 risk/reward
   }
   else
   {
      entryPrice = bid;
      sl = sweepExtreme + StopBufferPoints * point;    // just beyond the swept high
      double dist = sl - entryPrice;
      tp = entryPrice - dist;                           // 1:1 risk/reward
   }

   double stopDistance = MathAbs(entryPrice - sl);
   double stopDistancePoints = stopDistance / point;
   if(stopDistancePoints <= 0.0)
      return false;

   // --- Respect the broker's minimum stop distance ---
   long stopsLevel = SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL);
   if(stopsLevel > 0 && stopDistancePoints < stopsLevel)
   {
      Print("TryEnterTrade: computed stop distance ", DoubleToString(stopDistancePoints, 1),
            " points is inside the broker's minimum stop level (", stopsLevel, ") - skipping entry.");
      return false;
   }

   double lot = CalculateDynamicLot(stopDistancePoints);
   if(lot <= 0.0)
      return false; // CalculateDynamicLot() already logged the reason

   sl = NormalizeDouble(sl, digits);
   tp = NormalizeDouble(tp, digits);

   bool sent;
   if(orderType == ORDER_TYPE_BUY)
      sent = trade.Buy(lot, _Symbol, entryPrice, sl, tp, TradeComment);
   else
      sent = trade.Sell(lot, _Symbol, entryPrice, sl, tp, TradeComment);

   if(!sent)
      Print("TryEnterTrade: order send FAILED. retcode=", trade.ResultRetcode(),
            " desc=", trade.ResultRetcodeDescription());
   else
      Print("TryEnterTrade: ", EnumToString(orderType), " lot=", DoubleToString(lot, 2),
            " entry=", DoubleToString(entryPrice, digits),
            " sl=", DoubleToString(sl, digits), " tp=", DoubleToString(tp, digits),
            " stopDistPts=", DoubleToString(stopDistancePoints, 1));

   return sent;
}

//====================================================================
// OnTradeTransaction() - feeds closed-trade results into the
// consecutive-loss circuit breaker.
//====================================================================
void OnTradeTransaction(const MqlTradeTransaction &trans,
                         const MqlTradeRequest &request,
                         const MqlTradeResult &result)
{
   if(trans.type != TRADE_TRANSACTION_DEAL_ADD)
      return;

   if(!HistoryDealSelect(trans.deal))
      return;

   long   dealMagic = HistoryDealGetInteger(trans.deal, DEAL_MAGIC);
   string dealSymbol= HistoryDealGetString(trans.deal, DEAL_SYMBOL);
   long   dealEntry = HistoryDealGetInteger(trans.deal, DEAL_ENTRY);

   if(dealMagic != MagicNumber || dealSymbol != _Symbol)
      return;

   if(dealEntry != DEAL_ENTRY_OUT && dealEntry != DEAL_ENTRY_OUT_BY)
      return; // only closing deals count towards win/loss tracking

   double profit = HistoryDealGetDouble(trans.deal, DEAL_PROFIT)
                 + HistoryDealGetDouble(trans.deal, DEAL_SWAP)
                 + HistoryDealGetDouble(trans.deal, DEAL_COMMISSION);

   ConsecutiveLossTracker(profit);
}

//====================================================================
// OnTester() - backtest report
// -------------------------------------------------------------------
// Prints (and writes to Files\GoldLiquiditySweepEA_Report.csv) the
// statistics required by the backtesting spec: win rate, average
// win vs average loss, max consecutive losing streak, max drawdown
// (% and $), and how often each circuit breaker fired. See
// docs/BACKTESTING.md for how to actually run the required 1-year
// M1 test in the Strategy Tester - this function only formats
// whatever run you performed.
//====================================================================
double OnTester()
{
   double trades      = TesterStatistics(STAT_TRADES);
   double winTrades   = TesterStatistics(STAT_PROFIT_TRADES);
   double lossTrades  = TesterStatistics(STAT_LOSS_TRADES);
   double grossProfit = TesterStatistics(STAT_GROSS_PROFIT);
   double grossLoss   = TesterStatistics(STAT_GROSS_LOSS); // negative
   double maxConLosses= TesterStatistics(STAT_MAX_CONLOSSES);
   double balanceDD   = TesterStatistics(STAT_BALANCE_DD);
   double balanceDDPct= TesterStatistics(STAT_BALANCEDD_PERCENT);
   double equityDD    = TesterStatistics(STAT_EQUITY_DD);
   double equityDDPct = TesterStatistics(STAT_EQUITYDD_PERCENT);

   double winRate   = (trades > 0) ? (winTrades / trades * 100.0) : 0.0;
   double avgWin    = (winTrades  > 0) ? (grossProfit / winTrades)        : 0.0;
   double avgLoss   = (lossTrades > 0) ? (grossLoss   / lossTrades)       : 0.0; // negative

   string report = "";
   report += "==================== GoldLiquiditySweepEA BACKTEST REPORT ====================\r\n";
   report += StringFormat("Total trades           : %.0f\r\n", trades);
   report += StringFormat("Win rate                : %.2f%% (%d / %d)\r\n", winRate, (int)winTrades, (int)trades);
   report += StringFormat("Average win              : %.2f\r\n", avgWin);
   report += StringFormat("Average loss             : %.2f\r\n", avgLoss);
   report += StringFormat("Max consecutive losses   : %.0f\r\n", maxConLosses);
   report += StringFormat("Max balance drawdown     : %.2f (%.2f%%)\r\n", balanceDD, balanceDDPct);
   report += StringFormat("Max equity drawdown      : %.2f (%.2f%%)\r\n", equityDD, equityDDPct);
   report += "--- Circuit breaker activity across the tested period ---\r\n";
   report += StringFormat("Daily profit-target hits : %d\r\n", g_statDailyProfitTargetHits);
   report += StringFormat("Daily loss-cap hits      : %d\r\n", g_statDailyLossCapHits);
   report += StringFormat("Consecutive-loss breaker : %d\r\n", g_statConsecutiveLossBreakerHits);
   report += StringFormat("Account (-%.0f%%) breaker : %s\r\n", AccountCircuitBreakerPercent,
                           g_statAccountBreakerTriggered ? "TRIGGERED at " + TimeToString(g_statAccountBreakerTime) : "not triggered");

   if(g_statAccountBreakerTriggered || equityDDPct >= AccountCircuitBreakerPercent || balanceDDPct >= AccountCircuitBreakerPercent)
      report += "\r\n*** FLAG: this run breached (or would have breached) the -" +
                DoubleToString(AccountCircuitBreakerPercent, 0) +
                "% account circuit breaker. Live trading must remain disabled until manually reviewed. ***\r\n";

   report += "================================================================================\r\n";

   Print(report);

   int fh = FileOpen("GoldLiquiditySweepEA_Report.csv", FILE_WRITE | FILE_TXT | FILE_ANSI);
   if(fh != INVALID_HANDLE)
   {
      FileWriteString(fh, report);
      FileClose(fh);
   }

   return TesterStatistics(STAT_PROFIT_FACTOR);
}
