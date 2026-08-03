//+------------------------------------------------------------------+
//|                                       XAUUSD_ScalpingEA.mq5      |
//| XAU/USD M1 scalping EA: M15 trend + M5 momentum + M1 pullback    |
//| entry, session/news filters, daily profit/loss circuit breaker.  |
//| See docs/SPECIFICATION.md for the full spec this implements.     |
//+------------------------------------------------------------------+
#property copyright "gold-s-1m"
#property version   "1.00"
#property strict

#include <Trade\Trade.mqh>

//--- Session (Istanbul time, GMT+3 fixed)
input group "=== Session (Istanbul time GMT+3) ==="
input int      InpSessionStartHour   = 11;     // Trading window start hour (Istanbul)
input int      InpSessionEndHour     = 19;     // Trading window end hour (Istanbul)
input int      InpBrokerGmtOffset    = 2;      // Broker server time offset from GMT (hours) - SET FOR YOUR BROKER

//--- Money management
input group "=== Money Management ==="
input double   InpBaseBalance        = 50.0;   // Base balance for lot reference ($)
input double   InpBaseLot            = 0.01;   // Lot size at base balance
input double   InpLotScaleFactor     = 1.0;    // Lot scaling aggressiveness multiplier
input double   InpDailyProfitTargetPct = 20.0; // Daily profit target (%) -> stop for the day
input double   InpDailyLossLimitPct    = 10.0; // Daily loss limit (%) -> stop for the day

//--- Trade management
input group "=== Trade Management ==="
input int      InpTakeProfitPoints   = 12;     // Take Profit (points, broker _Point units)
input int      InpStopLossPoints     = 12;     // Stop Loss (points)
input int      InpBreakevenTriggerPoints = 5;  // Move SL to entry after this much profit (points)
input int      InpBreakevenBufferPoints  = 1;  // Extra buffer added past entry on breakeven
input int      InpTrailStartPoints   = 8;      // Start trailing after this much profit (points)
input int      InpTrailDistancePoints = 6;     // Trailing distance behind price (points)
input int      InpTrailStepPoints    = 2;      // Minimum improvement step before modifying SL
input int      InpMaxOpenPositions   = 1;      // Max simultaneous open positions for this EA
input ulong    InpMagicNumber        = 20260803;
input string   InpTradeComment       = "XAU_ScalpEA";

//--- Filters
input group "=== Entry Filters ==="
input int      InpMaxSpreadPoints    = 300;    // Max allowed spread (points) - REVIEW vs TP, see spec section 7
input int      InpEmaTrendPeriod     = 200;    // EMA period for M15 trend filter
input int      InpEmaFastPeriod      = 9;      // Fast EMA period (M5 & M1)
input int      InpEmaSlowPeriod      = 21;     // Slow EMA period (M5 & M1)
input int      InpRsiPeriod          = 14;     // RSI period (M1)
input double   InpRsiBuyMin          = 50.0;   // RSI lower bound for BUY
input double   InpRsiBuyMax          = 70.0;   // RSI upper bound for BUY
input double   InpRsiSellMin         = 30.0;   // RSI lower bound for SELL
input double   InpRsiSellMax         = 50.0;   // RSI upper bound for SELL
input int      InpAtrPeriod          = 14;     // ATR period (M1)
input int      InpMinAtrPoints       = 15;     // Minimum ATR (points) required to allow entry - avoids flat markets
input bool     InpUseImpulseFilter   = true;   // Block entry right after an oversized impulse candle
input double   InpMaxImpulseAtrMultiple = 2.5; // Last candle range must be <= ATR * this multiple
input double   InpEmaTouchTolerancePoints = 3; // Tolerance (points) for "touching" EMA9/21 on M1

//--- News filter
input group "=== News Filter (MQL5 Economic Calendar) ==="
input bool     InpUseNewsFilter      = true;   // Enable high-impact USD news blackout
input int      InpNewsBeforeMinutes  = 30;     // Minutes to block before a high-impact USD event
input int      InpNewsAfterMinutes   = 30;     // Minutes to block after a high-impact USD event
input int      InpNewsCacheRefreshMinutes = 15; // How often to refresh cached calendar events

CTrade trade;

//--- Indicator handles
int h_ema200_M15, h_ema9_M5, h_ema21_M5, h_ema9_M1, h_ema21_M1, h_rsi_M1, h_atr_M1;

//--- Daily state
datetime g_currentTradingDay = 0;   // midnight (Istanbul) of the tracked trading day
double   g_dayStartBalance   = 0.0;
bool     g_dayTradingHalted  = false;

//--- News cache
struct NewsEvent
  {
   datetime time;
   string   name;
  };
NewsEvent g_newsCache[];
datetime  g_newsCacheLastRefresh = 0;

//+------------------------------------------------------------------+
int OnInit()
  {
   h_ema200_M15 = iMA(_Symbol, PERIOD_M15, InpEmaTrendPeriod, 0, MODE_EMA, PRICE_CLOSE);
   h_ema9_M5    = iMA(_Symbol, PERIOD_M5,  InpEmaFastPeriod,  0, MODE_EMA, PRICE_CLOSE);
   h_ema21_M5   = iMA(_Symbol, PERIOD_M5,  InpEmaSlowPeriod,  0, MODE_EMA, PRICE_CLOSE);
   h_ema9_M1    = iMA(_Symbol, PERIOD_M1,  InpEmaFastPeriod,  0, MODE_EMA, PRICE_CLOSE);
   h_ema21_M1   = iMA(_Symbol, PERIOD_M1,  InpEmaSlowPeriod,  0, MODE_EMA, PRICE_CLOSE);
   h_rsi_M1     = iRSI(_Symbol, PERIOD_M1, InpRsiPeriod, PRICE_CLOSE);
   h_atr_M1     = iATR(_Symbol, PERIOD_M1, InpAtrPeriod);

   if(h_ema200_M15==INVALID_HANDLE || h_ema9_M5==INVALID_HANDLE || h_ema21_M5==INVALID_HANDLE ||
      h_ema9_M1==INVALID_HANDLE  || h_ema21_M1==INVALID_HANDLE || h_rsi_M1==INVALID_HANDLE || h_atr_M1==INVALID_HANDLE)
     {
      Print("Failed to create one or more indicator handles");
      return(INIT_FAILED);
     }

   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints(20);

   ResetDailyStateIfNeeded(true);
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   IndicatorRelease(h_ema200_M15);
   IndicatorRelease(h_ema9_M5);
   IndicatorRelease(h_ema21_M5);
   IndicatorRelease(h_ema9_M1);
   IndicatorRelease(h_ema21_M1);
   IndicatorRelease(h_rsi_M1);
   IndicatorRelease(h_atr_M1);
  }

//+------------------------------------------------------------------+
//| Istanbul time is GMT+3 fixed (no DST) per specification.         |
//+------------------------------------------------------------------+
datetime GetIstanbulTime()
  {
   datetime serverTime = TimeCurrent();
   int      offsetSeconds = (3 - InpBrokerGmtOffset) * 3600;
   return(serverTime + offsetSeconds);
  }

//+------------------------------------------------------------------+
datetime StartOfDay(datetime t)
  {
   return(t - (t % 86400));
  }

//+------------------------------------------------------------------+
bool IsWithinTradingSession()
  {
   datetime ist = GetIstanbulTime();
   MqlDateTime dt;
   TimeToStruct(ist, dt);
   return(dt.hour >= InpSessionStartHour && dt.hour < InpSessionEndHour);
  }

//+------------------------------------------------------------------+
//| Reset daily P&L tracking at the start of each new Istanbul day.  |
//+------------------------------------------------------------------+
void ResetDailyStateIfNeeded(bool force = false)
  {
   datetime ist = GetIstanbulTime();
   datetime todayStart = StartOfDay(ist);

   if(force || todayStart != g_currentTradingDay)
     {
      g_currentTradingDay = todayStart;
      g_dayStartBalance   = AccountInfoDouble(ACCOUNT_BALANCE);
      g_dayTradingHalted  = false;
      Print("New trading day (Istanbul): ", TimeToString(todayStart, TIME_DATE),
            " | start balance=", DoubleToString(g_dayStartBalance, 2));
     }
  }

//+------------------------------------------------------------------+
//| Check daily profit target / loss limit; close all & halt if hit. |
//+------------------------------------------------------------------+
void CheckDailyLimits()
  {
   if(g_dayTradingHalted)
      return;

   double equity = AccountInfoDouble(ACCOUNT_EQUITY);
   if(g_dayStartBalance <= 0.0)
      return;

   double changePct = (equity - g_dayStartBalance) / g_dayStartBalance * 100.0;

   if(changePct >= InpDailyProfitTargetPct)
     {
      Print("Daily profit target reached (", DoubleToString(changePct,2), "%). Closing all & halting for today.");
      CloseAllPositions();
      g_dayTradingHalted = true;
     }
   else if(changePct <= -InpDailyLossLimitPct)
     {
      Print("Daily loss limit reached (", DoubleToString(changePct,2), "%). Closing all & halting for today.");
      CloseAllPositions();
      g_dayTradingHalted = true;
     }
  }

//+------------------------------------------------------------------+
void CloseAllPositions()
  {
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0)
         continue;
      if(!PositionSelectByTicket(ticket))
         continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol)
         continue;
      if(PositionGetInteger(POSITION_MAGIC) != (long)InpMagicNumber)
         continue;
      trade.PositionClose(ticket);
     }
  }

//+------------------------------------------------------------------+
int CountOpenPositions()
  {
   int count = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0)
         continue;
      if(!PositionSelectByTicket(ticket))
         continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol)
         continue;
      if(PositionGetInteger(POSITION_MAGIC) != (long)InpMagicNumber)
         continue;
      count++;
     }
   return(count);
  }

//+------------------------------------------------------------------+
bool IsSpreadAcceptable()
  {
   long spreadPoints = SymbolInfoInteger(_Symbol, SYMBOL_SPREAD);
   return(spreadPoints <= InpMaxSpreadPoints);
  }

//+------------------------------------------------------------------+
//| Refresh cached high-impact USD calendar events covering roughly  |
//| [-2 days, +2 days] around now. Refreshed periodically, not every |
//| tick, to keep OnTick cheap.                                      |
//+------------------------------------------------------------------+
void RefreshNewsCache()
  {
   datetime now = TimeCurrent();
   if(g_newsCacheLastRefresh != 0 && now - g_newsCacheLastRefresh < InpNewsCacheRefreshMinutes * 60)
      return;

   g_newsCacheLastRefresh = now;
   ArrayResize(g_newsCache, 0);

   MqlCalendarValue values[];
   datetime from = now - 2 * 86400;
   datetime to   = now + 2 * 86400;

   if(!CalendarValueHistory(values, from, to, NULL, "USD"))
     {
      Print("CalendarValueHistory failed, error=", GetLastError());
      return;
     }

   int n = ArraySize(values);
   for(int i = 0; i < n; i++)
     {
      MqlCalendarEvent ev;
      if(!CalendarEventById(values[i].event_id, ev))
         continue;
      if(ev.importance != CALENDAR_IMPORTANCE_HIGH)
         continue;

      int idx = ArraySize(g_newsCache);
      ArrayResize(g_newsCache, idx + 1);
      g_newsCache[idx].time = values[i].time;
      g_newsCache[idx].name = ev.name;
     }
  }

//+------------------------------------------------------------------+
bool IsNewsBlackout()
  {
   if(!InpUseNewsFilter)
      return(false);

   RefreshNewsCache();

   datetime now = TimeCurrent();
   int n = ArraySize(g_newsCache);
   for(int i = 0; i < n; i++)
     {
      datetime blackoutStart = g_newsCache[i].time - InpNewsBeforeMinutes * 60;
      datetime blackoutEnd   = g_newsCache[i].time + InpNewsAfterMinutes * 60;
      if(now >= blackoutStart && now <= blackoutEnd)
         return(true);
     }
   return(false);
  }

//+------------------------------------------------------------------+
double GetIndicatorValue(int handle, int shift = 0)
  {
   double buf[];
   ArraySetAsSeries(buf, true);
   if(CopyBuffer(handle, 0, shift, 1, buf) <= 0)
      return(EMPTY_VALUE);
   return(buf[0]);
  }

//+------------------------------------------------------------------+
//| +1 = uptrend (price above EMA200 M15), -1 = downtrend, 0 = n/a    |
//+------------------------------------------------------------------+
int GetTrendM15()
  {
   double ema = GetIndicatorValue(h_ema200_M15, 0);
   if(ema == EMPTY_VALUE)
      return(0);
   double price = iClose(_Symbol, PERIOD_M15, 0);
   if(price > ema)
      return(1);
   if(price < ema)
      return(-1);
   return(0);
  }

//+------------------------------------------------------------------+
//| +1 = bullish momentum (EMA9 > EMA21 on M5), -1 = bearish, 0 = n/a |
//+------------------------------------------------------------------+
int GetMomentumM5()
  {
   double fast = GetIndicatorValue(h_ema9_M5, 0);
   double slow = GetIndicatorValue(h_ema21_M5, 0);
   if(fast == EMPTY_VALUE || slow == EMPTY_VALUE)
      return(0);
   if(fast > slow)
      return(1);
   if(fast < slow)
      return(-1);
   return(0);
  }

//+------------------------------------------------------------------+
bool GetLastClosedM1Candles(MqlRates &prev, MqlRates &last)
  {
   MqlRates rates[];
   if(CopyRates(_Symbol, PERIOD_M1, 1, 2, rates) < 2)
      return(false);
   // CopyRates returns oldest-first: rates[0]=shift2 (prev), rates[1]=shift1 (last closed)
   prev = rates[0];
   last = rates[1];
   return(true);
  }

//+------------------------------------------------------------------+
double CandleBody(const MqlRates &r) { return(MathAbs(r.close - r.open)); }
double CandleRange(const MqlRates &r) { return(r.high - r.low); }
double LowerWick(const MqlRates &r) { return(MathMin(r.open, r.close) - r.low); }
double UpperWick(const MqlRates &r) { return(r.high - MathMax(r.open, r.close)); }

//+------------------------------------------------------------------+
//| Reversal candle + EMA9/21(M1) touch check for the requested side.|
//+------------------------------------------------------------------+
bool IsM1PullbackReversal(bool buySide, double emaTolerance)
  {
   MqlRates prev, last;
   if(!GetLastClosedM1Candles(prev, last))
      return(false);

   double ema9  = GetIndicatorValue(h_ema9_M1, 1);
   double ema21 = GetIndicatorValue(h_ema21_M1, 1);
   if(ema9 == EMPTY_VALUE || ema21 == EMPTY_VALUE)
      return(false);

   bool touchedEma = (last.low  <= ema9  + emaTolerance && last.high >= ema9  - emaTolerance) ||
                     (last.low  <= ema21 + emaTolerance && last.high >= ema21 - emaTolerance);
   if(!touchedEma)
      return(false);

   bool isBullishBody = last.close > last.open;
   bool isBearishBody = last.close < last.open;
   double body = CandleBody(last);

   if(buySide)
     {
      if(!isBullishBody)
         return(false);
      bool pinBar = (LowerWick(last) >= 1.5 * body) && (LowerWick(last) > UpperWick(last));
      bool engulfing = (prev.close < prev.open) && (last.close > prev.open) && (last.open <= prev.close);
      return(pinBar || engulfing);
     }
   else
     {
      if(!isBearishBody)
         return(false);
      bool pinBar = (UpperWick(last) >= 1.5 * body) && (UpperWick(last) > LowerWick(last));
      bool engulfing = (prev.close > prev.open) && (last.close < prev.open) && (last.open >= prev.close);
      return(pinBar || engulfing);
     }
  }

//+------------------------------------------------------------------+
bool IsAtrSufficient(double &atrPoints)
  {
   double atr = GetIndicatorValue(h_atr_M1, 1);
   if(atr == EMPTY_VALUE)
      return(false);
   atrPoints = atr / _Point;
   return(atrPoints >= InpMinAtrPoints);
  }

//+------------------------------------------------------------------+
//| Reject entries right after an oversized impulse candle relative  |
//| to current volatility, to avoid chasing exhausted moves.         |
//+------------------------------------------------------------------+
bool PassesImpulseFilter(double atrValue)
  {
   if(!InpUseImpulseFilter)
      return(true);

   MqlRates prev, last;
   if(!GetLastClosedM1Candles(prev, last))
      return(true);

   double range = CandleRange(last);
   return(range <= atrValue * InpMaxImpulseAtrMultiple);
  }

//+------------------------------------------------------------------+
bool CheckRsiFilter(bool buySide)
  {
   double rsi = GetIndicatorValue(h_rsi_M1, 1);
   if(rsi == EMPTY_VALUE)
      return(false);

   if(buySide)
      return(rsi >= InpRsiBuyMin && rsi <= InpRsiBuyMax);
   else
      return(rsi >= InpRsiSellMin && rsi <= InpRsiSellMax);
  }

//+------------------------------------------------------------------+
double CalculateLotSize()
  {
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double lot = InpBaseLot * (balance / InpBaseBalance) * InpLotScaleFactor;

   double stepLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   double minLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double maxLot  = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);

   if(stepLot > 0.0)
      lot = MathRound(lot / stepLot) * stepLot;

   lot = MathMax(minLot, MathMin(maxLot, lot));
   return(NormalizeDouble(lot, 2));
  }

//+------------------------------------------------------------------+
void TryOpenEntry()
  {
   if(CountOpenPositions() >= InpMaxOpenPositions)
      return;

   int trend = GetTrendM15();
   if(trend == 0)
      return;

   int momentum = GetMomentumM5();
   if(momentum != trend)
      return; // M5 momentum must agree with M15 trend direction

   bool buySide = (trend == 1);

   double atrValue = GetIndicatorValue(h_atr_M1, 1);
   double atrPoints;
   if(!IsAtrSufficient(atrPoints))
      return;

   if(!PassesImpulseFilter(atrValue))
      return;

   if(!IsM1PullbackReversal(buySide, InpEmaTouchTolerancePoints * _Point))
      return;

   if(!CheckRsiFilter(buySide))
      return;

   double lot = CalculateLotSize();
   if(lot <= 0.0)
      return;

   double price = buySide ? SymbolInfoDouble(_Symbol, SYMBOL_ASK) : SymbolInfoDouble(_Symbol, SYMBOL_BID);
   double sl = buySide ? price - InpStopLossPoints * _Point   : price + InpStopLossPoints * _Point;
   double tp = buySide ? price + InpTakeProfitPoints * _Point : price - InpTakeProfitPoints * _Point;

   sl = NormalizeDouble(sl, _Digits);
   tp = NormalizeDouble(tp, _Digits);

   bool ok = buySide ? trade.Buy(lot, _Symbol, price, sl, tp, InpTradeComment)
                      : trade.Sell(lot, _Symbol, price, sl, tp, InpTradeComment);

   if(!ok)
      Print("Order failed: ", trade.ResultRetcodeDescription());
  }

//+------------------------------------------------------------------+
//| Breakeven + trailing stop management for open EA positions.      |
//+------------------------------------------------------------------+
void ManageOpenPositions()
  {
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0)
         continue;
      if(!PositionSelectByTicket(ticket))
         continue;
      if(PositionGetString(POSITION_SYMBOL) != _Symbol)
         continue;
      if(PositionGetInteger(POSITION_MAGIC) != (long)InpMagicNumber)
         continue;

      long   type       = PositionGetInteger(POSITION_TYPE);
      double entry      = PositionGetDouble(POSITION_PRICE_OPEN);
      double currentSl  = PositionGetDouble(POSITION_SL);
      double tp         = PositionGetDouble(POSITION_TP);
      bool   isBuy      = (type == POSITION_TYPE_BUY);
      double bid        = SymbolInfoDouble(_Symbol, SYMBOL_BID);
      double ask        = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
      double curPrice   = isBuy ? bid : ask;
      double profitPts  = isBuy ? (curPrice - entry) / _Point : (entry - curPrice) / _Point;

      double newSl = currentSl;
      bool   modify = false;

      // Breakeven
      if(profitPts >= InpBreakevenTriggerPoints)
        {
         double beSl = isBuy ? entry + InpBreakevenBufferPoints * _Point
                              : entry - InpBreakevenBufferPoints * _Point;
         bool slNeedsBe = isBuy ? (currentSl < beSl) : (currentSl > beSl || currentSl == 0.0);
         if(slNeedsBe)
           {
            newSl = beSl;
            modify = true;
           }
        }

      // Trailing stop (only tightens, never loosens)
      if(profitPts >= InpTrailStartPoints)
        {
         double trailSl = isBuy ? curPrice - InpTrailDistancePoints * _Point
                                 : curPrice + InpTrailDistancePoints * _Point;
         bool improved = isBuy ? (trailSl > newSl + InpTrailStepPoints * _Point)
                                : (newSl == 0.0 || trailSl < newSl - InpTrailStepPoints * _Point);
         if(improved)
           {
            newSl = trailSl;
            modify = true;
           }
        }

      if(modify)
        {
         newSl = NormalizeDouble(newSl, _Digits);
         if(!trade.PositionModify(ticket, newSl, tp))
            Print("PositionModify failed for #", ticket, ": ", trade.ResultRetcodeDescription());
        }
     }
  }

//+------------------------------------------------------------------+
void OnTick()
  {
   ResetDailyStateIfNeeded();
   CheckDailyLimits();
   ManageOpenPositions();

   if(g_dayTradingHalted)
      return;
   if(!IsWithinTradingSession())
      return;
   if(!IsSpreadAcceptable())
      return;
   if(IsNewsBlackout())
      return;

   TryOpenEntry();
  }
//+------------------------------------------------------------------+
