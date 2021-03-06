//+------------------------------------------------------------------+
//|                                             dataToFileExport.mq5 |
//|                                    Copyright 2019, Yuri de Paula |
//+------------------------------------------------------------------+
#property version   "1.00"

//includes
#include <Trade\Trade.mqh>

//input params
input int    movingPeriod = 15;                      // moving Average period
input int    levelCalc    = 800;                     // level calculated from IMA
input string baseUrl      = "http://127.0.0.1:433/"; // base uri for api send data 



//custom structs
//struct for save basic data
struct BasicData{
   datetime time;   // datetime of the saved info
   string   symbol; // current symbol
   double   bid;    // latest known buyer's price (offer price)
   double   ask;    // latest known seller's price
};

// struct for save IMA data
struct IMAData{
   datetime time;     // datetime of the saved info
   string   symbol;   // current symbol
   double   imaVal;   // value of moving average
   double   buyLine;  // price for opening a buy order
   double   sellLine; // price for opening a sell order
};

// struct for save server data
struct ServerData{
   string broker;
   string server;
};


//struct for save placed information
struct PlacedData{
   bool     isPlaced;      // control for placed position
   string   type;          // type of placed (VENDA|COMPRA)
   datetime time;          // datetime of the saved info
   double   price;         // price that placed the position
   double   target;        // target to trigger opening position
   bool     messageSended; // control of sended message
   bool     isCanceled;    // control of canceled placed position
};

//struct for save position information
struct PositionData{
   bool     isPositioned;  // control for position
   string   type;          // type of position (VENDA|COMPRA)
   datetime time;          // datetime of the saved info
   double   stopLoss;      // stoploss price
   double   takeProfit;    // takeProfit price
   bool     messageSended; // control of sended message
   bool     refresh;       // control for updated data
   bool     isTerminaed;   // control of closed position
};

// Trade object
enum ENUM_TRADE_OBJ{
   TRADE_OBJ_NULL=0,       // not specified
   TRADE_OBJ_POSITION=1,   // position
   TRADE_OBJ_ORDER=2,      // order
   TRADE_OBJ_DEAL=3,       // deal
   TRADE_OBJ_HIST_ORDER=4, // historical order
};



// variable declaration
int          ExtHandle=0;  // IMA declaration
BasicData    basicData;    // variable for save basic data to export
IMAData      imaData;      // variable for save ima data to export
ServerData   serverData;   // variable for save server data to export
PlacedData   placedData;   // variable for sabe placed data
PositionData positionData; // variable for save position data
double       iMABuffer[];  // indicator buffer 
uint         gTransCnt=0;  // counter for control transaction iteration on the onTradeTrasaction event
 
static bool sended = false; //test control for send only once 
   
   
   
//events handlers
//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit() {
   // Moving Average indicator
   ExtHandle=iMA(_Symbol,_Period,movingPeriod,0,MODE_SMA,PRICE_CLOSE);
   if(ExtHandle==INVALID_HANDLE){
      printf("Error creating MA indicator");
      return(INIT_FAILED);
   }
   
   serverData.broker = AccountInfoString(ACCOUNT_COMPANY);
   serverData.server = AccountInfoString(ACCOUNT_SERVER);
   
   sendServerData();
   
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick(){
   //if(isNewBar()){
      calculateIMAsInfo();
      sendIMAData();
      sendServerData();
   //}

   getBasicData();
   sendBasicData();
}

//+------------------------------------------------------------------+
//| Expert trade transaction function                                |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction &trans,// transaction
                        const MqlTradeRequest &request,  // request
                        const MqlTradeResult &result){   // response

   static ENUM_TRADE_OBJ             trade_obj;   // specifies the trade object at the first pass
   static ENUM_TRADE_REQUEST_ACTIONS last_action; // market operation at the first pass

   bool is_to_reset_cnt = false;
   string deal_symbol   = trans.symbol;


   //--- ========== Types of transactions [START]
   switch(trans.type){
      //--- 1) if it is a request
      case TRADE_TRANSACTION_REQUEST: {
         last_action=request.action;
         string action_str;

         //--- what is the request for?
         switch(last_action){
            //--- а) on market (PLACED ORDEM A MERCADO)
            case TRADE_ACTION_DEAL:{
               getPlacedData(trans, request, false);
               
               trade_obj=TRADE_OBJ_POSITION;
               break;
            }
            
            //--- б) place a pending order (PLACED ORDER PENDENTE)
            case TRADE_ACTION_PENDING:{
               getPlacedData(trans, request, false);
               trade_obj=TRADE_OBJ_ORDER;
               break;
            }
            
            //--- в) modify position
            case TRADE_ACTION_SLTP: {
               trade_obj=TRADE_OBJ_POSITION;
               break;
            }
            
            //--- г) modify the order
            case TRADE_ACTION_MODIFY: {
               trade_obj=TRADE_OBJ_ORDER;
               break;
            }
            
            //--- д) delete the order
            case TRADE_ACTION_REMOVE: {
               trade_obj=TRADE_OBJ_ORDER;
               break;
            }
         }
         
         break;
      }
      
      //--- 2) if it is an addition of a new open order
      case TRADE_TRANSACTION_ORDER_ADD: {break;}
      
      //--- 3) if it is a deletion of an order from the list of open ones
      case TRADE_TRANSACTION_ORDER_DELETE:{break;}
      
      //--- 4) if it is an addition of a new order to the history
      case TRADE_TRANSACTION_HISTORY_ADD:{
         //--- if a pending order is being processed
         if(trade_obj==TRADE_OBJ_ORDER){
            //--- if it is the third pass
            if(gTransCnt==2){
               //--- if the order was canceled, check the deals
               datetime now=TimeCurrent();

               //--- request the history of orders and deals
               HistorySelect(now-PeriodSeconds(PERIOD_H1),now);

               //--- attempt to find a deal for the order
               CDealInfo myDealInfo;
               int all_deals=HistoryDealsTotal();
               
               bool is_found=false;
               for(int deal_idx=all_deals;deal_idx>=0;deal_idx--)
                  if(myDealInfo.SelectByIndex(deal_idx))
                     if(myDealInfo.Order()==trans.order)
                        is_found=true;

               //--- if a deal was not found (ORDEM CANCELADA)
               if(!is_found){
                  is_to_reset_cnt=true;
               }
            }
            
            //--- if it is the fourth pass (ORDEM DELETADA)
            if(gTransCnt==3){
               is_to_reset_cnt=true;
            }
         }
         
         break;
      }
      
      //--- 5) if it is an addition of a deal to history
      case TRADE_TRANSACTION_DEAL_ADD:{
         is_to_reset_cnt=true;
         
         ulong deal_ticket=trans.deal;
         ENUM_DEAL_TYPE deal_type=trans.deal_type;

         if(deal_ticket>0){
            datetime now=TimeCurrent();

            //--- request the history of orders and deals
            HistorySelect(now-PeriodSeconds(PERIOD_H1),now);

            //--- select a deal by the ticket
            if(HistoryDealSelect(deal_ticket)){
               //--- check the deal
               CDealInfo myDealInfo;
               myDealInfo.Ticket(deal_ticket);
               long order=myDealInfo.Order();

               //--- parameters of the deal
               ENUM_DEAL_ENTRY  deal_entry=myDealInfo.Entry();
               double deal_vol=0.;
               
               if(myDealInfo.InfoDouble(DEAL_VOLUME,deal_vol))
                  if(myDealInfo.InfoString(DEAL_SYMBOL,deal_symbol)){
                     
                     //--- position
                     CPositionInfo myPos;
                     double pos_vol=WRONG_VALUE;
                     
                     if(myPos.Select(deal_symbol))
                        pos_vol=myPos.Volume();

                     //--- if the market was entered
                     if(deal_entry==DEAL_ENTRY_IN){
                        //--- 1) opening of a position (NOVA POSIÇÃO ABERTA)
                        if(deal_vol==pos_vol){
                           getPositionData(trans, true, false);
                          
                        //--- 2) addition of lots to the open position (ADICIONAL A POSIÇÃO ABERTA)        
                        } else if(deal_vol<pos_vol)
                           NULL;
                     }

                     //--- if the market was exited
                     else if(deal_entry==DEAL_ENTRY_OUT){
                        if(deal_vol>0.0){
                           //--- 1) closure of a position (POSIÇÃO FECHADA)
                           if(pos_vol==WRONG_VALUE) {                              
                              getPositionData(trans, false, true);
                              
                           //--- 2) partial closure of the open position (FECHAMENTO PARCIAL)      
                           } else if(pos_vol>0.0)
                              NULL;
                        }
                     }

                     //--- if position was reversed (POSIÇÃO REVERSA)
                     else if(deal_entry==DEAL_ENTRY_INOUT){
                        if(deal_vol>0.0)
                           if(pos_vol>0.0)
                              NULL;
                     }
                  }

               //--- activation of an order (ATIVAÇÃO ORDEM PENDENTE)
               if(trade_obj==TRADE_OBJ_ORDER)
                  NULL;
            }
         }

         break;
      }
      
      //--- 6) if it is a modification of a position 
      case TRADE_TRANSACTION_POSITION:{
         is_to_reset_cnt=true;
           
         //AQUI ATUALIZA STOP LOSS E TAKE PROFIT
         getPositionData(trans, true, false);
         
         break;
      }
      
      //--- 7) if it is a modification of an open order
      case TRADE_TRANSACTION_ORDER_UPDATE:{

         //--- if it was the first pass (ORDEM CANCELADA)
         if(gTransCnt==0){
            trade_obj=TRADE_OBJ_ORDER;
         }
         
         //--- if it was the second pass (MOFIDICAÇÃO ORDEM PENDENTE)
         if(gTransCnt==1){
            //--- if it is a modification of an order
            if(last_action==TRADE_ACTION_MODIFY){
               //--- clear counter
               is_to_reset_cnt=true;
            }
            
            //--- if it is a deletion of an order
            if(last_action==TRADE_ACTION_REMOVE){
               // AQUI MARCA A ORDEM PLACED COMO CANCELADA
               getPlacedData(trans, request, true);               
            }
         }
         
         //--- if it was the third pass (AQUI PENDURA A NOVA ORDEM)
         if(gTransCnt==2){
            //--- clear counter
            is_to_reset_cnt=true;
         }

         break;
      }
   }
   //--- ========== Transaction types [END]

   //--- pass counter
   if(is_to_reset_cnt){
      gTransCnt=0;
      trade_obj=0;
      last_action=-1;
   }
   else
      gTransCnt++;
}



//json parsers
//+------------------------------------------------------------------+
//| Convert the struct into a json                                   |
//+------------------------------------------------------------------+
string basicDataToJson() {
   string json = "{ " +
                   " \"time\": \""      + basicData.time   + "\", " +
                   " \"symbol\": \""    + basicData.symbol + "\", " +
                   " \"buyPrice\": \""  + basicData.bid    + "\", " +
                   " \"sellPrice\": \"" + basicData.ask    + "\" " +
                 "}";
   return json;                     
}

//+------------------------------------------------------------------+
//| Convert the struct into a json                                   |
//+------------------------------------------------------------------+
string imaDataToJson() {
   string json = "{ " +
                   " \"time\": \""          + imaData.time     + "\", " +
                   " \"symbol\": \""        + imaData.symbol   + "\", " +
                   " \"movingAverage\": \"" + imaData.imaVal   + "\", " +
                   " \"buyLine\": \""       + imaData.buyLine  + "\", " +
                   " \"sellLine\": \""      + imaData.sellLine + "\" " +                 
                 "}";
   return json;                     
}

//+------------------------------------------------------------------+
//| Convert the struct into a json                                   |
//+------------------------------------------------------------------+
string serverDataToJson() {
   string json = "{ " +
                   " \"broker\": \"" + serverData.broker + "\", " +
                   " \"server\": \"" + serverData.server + "\" " +               
                 "}";
   return json;                     
}

//+------------------------------------------------------------------+
//| Convert the struct into a json                                   |
//+------------------------------------------------------------------+
string placedDataToJson() {
   string json = "{ " +
                   " \"isPlaced\": \""      + placedData.isPlaced      + "\", " +
                   " \"type\": \""          + placedData.type          + "\", " +
                   " \"time\": \""          + placedData.time          + "\", " +
                   " \"price\": \""         + placedData.price         + "\", " +
                   " \"target\": \""        + placedData.target        + "\", " +
                   " \"messageSended\": \"" + placedData.messageSended + "\", " +
                   " \"isCanceled\": \""    + placedData.isCanceled    + "\"" +
                 "}";
   return json;                     
}

//+------------------------------------------------------------------+
//| Convert the struct into a json                                   |
//+------------------------------------------------------------------+
string positionDataToJson() {
   string json = "{ " +
                   " \"isPositioned\": \""  + positionData.isPositioned  + "\", " +
                   " \"type\": \""          + positionData.type          + "\", " +
                   " \"time\": \""          + positionData.time          + "\", " +
                   " \"stopLoss\": \""      + positionData.stopLoss      + "\", " +
                   " \"takeProfit\": \""    + positionData.takeProfit    + "\", " +
                   " \"messageSended\": \"" + positionData.messageSended + "\", " +
                   " \"refresh\": \""       + positionData.refresh       + "\", " +
                   " \"isTerminaed\": \""   + positionData.isTerminaed   + "\" " +
                 "}";
   return json;                     
}



//setting custom objects
//+------------------------------------------------------------------+
//| get basic data and save in the struct                            |
//+------------------------------------------------------------------+
void getBasicData(){
   basicData.time   = TimeCurrent();
   basicData.symbol = _Symbol;
   basicData.bid    = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   basicData.ask    = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
}

//+------------------------------------------------------------------+
//| Calculate IMA and save in the struct                             |
//+------------------------------------------------------------------+
void calculateIMAsInfo(){
   //get current Moving Average 
   double ma[1];
   if(!(CopyBuffer(ExtHandle,0,0,1,ma) !=1)){
      imaData.time     = TimeCurrent();
      imaData.symbol   = _Symbol;
      imaData.imaVal   = ma[0];
      imaData.buyLine  = imaData.imaVal - levelCalc;
      imaData.sellLine = imaData.imaVal + levelCalc;
   }
}

//+------------------------------------------------------------------+
//| get palced data, save in the structure and send to server        |
//+------------------------------------------------------------------+
void getPlacedData(const MqlTradeTransaction &trans,// transaction
                   const MqlTradeRequest &request,  // request
                   const bool canceled){
   
   if(trans.type==TRADE_TRANSACTION_REQUEST)    
      if(request.order != 0 ) {
         
         placedData.isPlaced = true;
         
         //apenas para identificar
         Print("### TIPO DA ORDEM: " + EnumToString(request.type));
         
         if(EnumToString(request.type) == ORDER_TYPE_BUY_STOP || 
            EnumToString(request.type) == ORDER_TYPE_BUY_LIMIT || 
            EnumToString(request.type) == ORDER_TYPE_BUY_STOP_LIMIT){
            placedData.type  = "COMPRA";
            placedData.price = SymbolInfoDouble(_Symbol, SYMBOL_BID);
         } else {
            placedData.type  = "VENDA";
            placedData.price = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
         }
            
         placedData.time          = TimeCurrent();
         placedData.target        = request.price;
         placedData.messageSended = false;
         placedData.isCanceled    = canceled;
         
         sendPlacedData();
     }
}

//+------------------------------------------------------------------+
//| get position data, save in the structure and send to server        |
//+------------------------------------------------------------------+
void getPositionData(const MqlTradeTransaction &trans,
                     const bool refresh,
                     const bool isTerminated){
   
   positionData.isPositioned  = true;
   positionData.type          = placedData.type;
   positionData.time          = TimeCurrent();
   positionData.stopLoss      = trans.price_sl;
   positionData.takeProfit    = trans.price_tp;
   positionData.messageSended = false;
   positionData.refresh       = refresh;
   positionData.isTerminaed   = isTerminated;
      
   sendPositionData();  
}

//web request methods
//+------------------------------------------------------------------+
//| Encapsulated WebRequest method for basic data                    |
//+------------------------------------------------------------------+
void sendBasicData() {
   sendWebRequest(basicDataToJson(), "basic");
}  

//+------------------------------------------------------------------+
//| Encapsulated WebRequest method for ima data                      |
//+------------------------------------------------------------------+
void sendIMAData(){
   sendWebRequest(imaDataToJson(), "ima");
}

//+------------------------------------------------------------------+
//| Encapsulated WebRequest method for server data                   |
//+------------------------------------------------------------------+
void sendServerData(){
   sendWebRequest(serverDataToJson(), "server");
}

//+------------------------------------------------------------------+
//| Encapsulated WebRequest method for placed data                   |
//+------------------------------------------------------------------+
void sendPlacedData(){
   sendWebRequest(placedDataToJson(), "placed");
}

//+------------------------------------------------------------------+
//| Encapsulated WebRequest method for position data                 |
//+------------------------------------------------------------------+
void sendPositionData(){
   sendWebRequest(positionDataToJson(), "position");
}

//+------------------------------------------------------------------+
//| Generic WebRequest method                                        |
//+------------------------------------------------------------------+
void sendWebRequest(string message, string endPoint){
   //if(!sended) {
   string method  = "POST";
   string url     = baseUrl + endPoint;
   string headers = "Content-Type:application/json";
   int timeOut    = 10000; 
   
   char arrPost[], arrResult[], arr[];
   string strResponseHeaders;
   
   StringToCharArray(message, arrPost);
   
   //needs to remove the last char for json converter (/n)
   ArrayCopy(arr, arrPost, 0, 0, ArraySize(arrPost)-1);     
   
   WebRequest(method, url, headers, timeOut, arr, arrResult, strResponseHeaders);
   
   //sended = true;}
}
 
 

//@Deprecated
//+------------------------------------------------------------------+
//| Returns true if a new bar has appeared                           |
//+------------------------------------------------------------------+
bool isNewBar(){
   // memorize the time of opening of the last bar in the static variable
   static datetime last_time=0;
   // current time
   datetime lastbar_time=SeriesInfoInteger(Symbol(),Period(),SERIES_LASTBAR_DATE);

   // if it is the first call of the function
   if(last_time==0){
      // set the time and exit
      last_time=lastbar_time;
      return(false);
   }

   // if the time differs
   if(last_time!=lastbar_time){
      // memorize the time and return true
      last_time=lastbar_time;
      return(true);
   }
   // if we passed to this line, then the bar is not new; return false
   return(false);
}