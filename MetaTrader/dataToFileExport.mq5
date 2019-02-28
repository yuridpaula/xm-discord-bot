//+------------------------------------------------------------------+
//|                                             dataToFileExport.mq5 |
//|                                    Copyright 2019, Yuri de Paula |
//+------------------------------------------------------------------+
#property version   "1.00"

input int    movingPeriod = 15;                      // moving Average period
input int    levelCalc    = 800;                     // level calculated from IMA
input string baseUrl      = "http://127.0.0.1:433/"; // base uri for api send data 

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

int        ExtHandle=0; // IMA declaration
BasicData  basicData;   // variable for save basic data to export
IMAData    imaData;     // variable for save ima data to export
ServerData serverData;  // variable for save server data to export
double     iMABuffer[]; // indicator buffer 
 
static bool sended = false; //test control for send only once 
   
   
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
//| Convert the struct into a json                                   |
//+------------------------------------------------------------------+
string basicDataToJson() {
   string json = "{ " +
                   " \"time\": \"" + basicData.time + "\", " +
                   " \"symbol\": \"" + basicData.symbol + "\", " +
                   " \"buyPrice\": \"" + basicData.bid + "\", " +
                   " \"sellPrice\": \"" + basicData.ask + "\" " +
                 "}";
   return json;                     
}

//+------------------------------------------------------------------+
//| Convert the struct into a json                                   |
//+------------------------------------------------------------------+
string imaDataToJson() {
   string json = "{ " +
                   " \"time\": \"" + imaData.time + "\", " +
                   " \"symbol\": \"" + imaData.symbol + "\", " +
                   " \"movingAverage\": \"" + imaData.imaVal + "\", " +
                   " \"buyLine\": \"" + imaData.buyLine + "\", " +
                   " \"sellLine\": \"" + imaData.sellLine + "\" " +                 
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
//| Generic WebRequest method                                        |
//+------------------------------------------------------------------+
void sendWebRequest(string message, string endPoint){
   //if(!sended) {
   string method = "POST";
   string url = baseUrl + endPoint;
   string headers = "Content-Type:application/json";
   int timeOut = 10000; 
   char arrPost[], arrResult[], arr[];
   string strResponseHeaders;
   
   StringToCharArray(message, arrPost);
   
   //needs to remove the last char for json converter (/n)
   ArrayCopy(arr, arrPost, 0, 0, ArraySize(arrPost)-1);     
   
   WebRequest(method, url, headers, timeOut, arr, arrResult, strResponseHeaders);
   
   //sended = true;}
}
 