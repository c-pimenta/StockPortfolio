import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError, retry, delay } from 'rxjs';

interface QuoteResponse {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  datetime: string;
  timestamp: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  previous_close: string;
  change: string;
  percent_change: string;
  price?: string;
  status?: string;
  message?: string;
}

interface TimeSeriesValue {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

interface TimeSeriesResponse {
  meta: {
    symbol: string;
    interval: string;
    currency: string;
    exchange_timezone: string;
    exchange: string;
    mic_code: string;
    type: string;
  };
  values: TimeSeriesValue[];
  status?: string;
  message?: string;
}

interface HistoricalData {
  dates: string[];
  prices: number[];
}

@Injectable({
  providedIn: 'root'
})
export class StockService {
  // Remove the API key - it's now in the Netlify function
  // private apiKey = // REMOVED - now handled by Netlify function
  private functionsUrl = '/.netlify/functions'; // Base URL for Netlify functions
    
  constructor(private http: HttpClient) {}

  // Generic method to call Netlify functions
  private callStockAPI(endpoint: string, params: { [key: string]: string }): Observable<any> {
    const queryParams = new URLSearchParams(params).toString();
    const url = `${this.functionsUrl}/stock-data?endpoint=${endpoint}&${queryParams}`;
    
    return this.http.get(url).pipe(
      retry(2),
      delay(100)
    );
  }

  getCurrentPrice(ticker: string): Observable<number | null> {
    const cleanTicker = ticker.trim().toUpperCase();
    
    return this.callStockAPI('quote', { symbol: cleanTicker }).pipe(
      map((res: QuoteResponse) => {
        if (res.status === 'error') {
          console.warn(`Erro na API para ${cleanTicker}:`, res.message);
          return null;
        }
        
        const price = res.price || res.close;
        if (!price) {
          console.warn(`Preço não encontrado para ${cleanTicker}`);
          return null;
        }
        
        const numericPrice = parseFloat(price);
        if (isNaN(numericPrice)) {
          console.warn(`Preço inválido para ${cleanTicker}:`, price);
          return null;
        }
        
        return numericPrice;
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(`Erro ao obter preço atual para ${cleanTicker}:`, err);
        if (err.status === 429) {
          console.warn('Rate limit excedido. Tente novamente em alguns segundos.');
        } else if (err.status === 401) {
          console.error('API Key inválida ou expirada.');
        } else if (err.status === 404) {
          console.warn(`Ticker ${cleanTicker} não encontrado.`);
        }
        return of(null);
      })
    );
  }

  getHistoricalData(ticker: string, interval: string = '1day', outputsize: number = 30): Observable<HistoricalData | null> {
    const cleanTicker = ticker.trim().toUpperCase();
    
    return this.callStockAPI('time_series', { 
      symbol: cleanTicker, 
      interval: interval, 
      outputsize: outputsize.toString() 
    }).pipe(
      map((res: TimeSeriesResponse) => {
        if (res.status === 'error') {
          console.warn(`Erro na API para dados históricos de ${cleanTicker}:`, res.message);
          return null;
        }
        
        if (!res.values || res.values.length === 0) {
          console.warn(`Nenhum dado histórico encontrado para ${cleanTicker}`);
          return null;
        }
        
        try {
          const dates = res.values.map(v => v.datetime).reverse();
          const prices = res.values.map(v => {
            const price = parseFloat(v.close);
            if (isNaN(price)) {
              throw new Error(`Preço inválido: ${v.close}`);
            }
            return price;
          }).reverse();
          
          return {
            dates,
            prices
          };
        } catch (error) {
          console.error(`Erro ao processar dados históricos para ${cleanTicker}:`, error);
          return null;
        }
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(`Erro ao obter dados históricos para ${cleanTicker}:`, err);
        if (err.status === 429) {
          console.warn('Rate limit excedido. Tente novamente em alguns segundos.');
        } else if (err.status === 401) {
          console.error('API Key inválida ou expirada.');
        } else if (err.status === 404) {
          console.warn(`Ticker ${cleanTicker} não encontrado.`);
        }
        return of(null);
      })
    );
  }

  getMultipleHistoricalData(tickers: string[]): Observable<{ [ticker: string]: HistoricalData | null }> {
    const cleanTickers = tickers.map(ticker => ticker.trim().toUpperCase());
    
    return this.callStockAPI('time_series', { 
      symbol: cleanTickers.join(','), 
      interval: '1day', 
      outputsize: '30' 
    }).pipe(
      map((res: { [key: string]: TimeSeriesResponse }) => {
        const result: { [ticker: string]: HistoricalData | null } = {};
        cleanTickers.forEach(ticker => {
          const data = res[ticker];
          if (!data || data.status === 'error' || !data.values || data.values.length === 0) {
            console.warn(`Nenhum dado histórico encontrado para ${ticker}`);
            result[ticker] = null;
            return;
          }
          
          try {
            const dates = data.values.map(v => v.datetime).reverse();
            const prices = data.values.map(v => {
              const price = parseFloat(v.close);
              if (isNaN(price)) {
                throw new Error(`Preço inválido: ${v.close}`);
              }
              return price;
            }).reverse();
            
            result[ticker] = { dates, prices };
          } catch (error) {
            console.error(`Erro ao processar dados históricos para ${ticker}:`, error);
            result[ticker] = null;
          }
        });
        return result;
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(`Erro ao obter dados históricos para múltiplos tickers:`, err);
        if (err.status === 429) {
          console.warn('Rate limit excedido. Tente novamente em alguns segundos.');
        } else if (err.status === 401) {
          console.error('API Key inválida ou expirada.');
        } else if (err.status === 404) {
          console.warn(`Um ou mais tickers não encontrados.`);
        }
        return of(cleanTickers.reduce((acc, ticker) => ({ ...acc, [ticker]: null }), {}));
      })
    );
  }

  getHistoricalPrice(ticker: string, date: Date): Observable<number | null> {
    const cleanTicker = ticker.trim().toUpperCase();
    const formattedDate = date.toISOString().split('T')[0];
    
    return this.callStockAPI('time_series', { 
      symbol: cleanTicker, 
      interval: '1day', 
      start_date: formattedDate, 
      end_date: formattedDate 
    }).pipe(
      map((res: TimeSeriesResponse) => {
        if (res.status === 'error') {
          console.warn(`Erro na API para preço histórico de ${cleanTicker} em ${formattedDate}:`, res.message);
          return null;
        }

        if (!res.values || res.values.length === 0) {
          console.warn(`Nenhum dado histórico encontrado para ${cleanTicker} em ${formattedDate}`);
          return null;
        }

        const price = parseFloat(res.values[0].close);
        if (isNaN(price)) {
          console.warn(`Preço inválido para ${cleanTicker} em ${formattedDate}:`, res.values[0].close);
          return null;
        }

        return price;
      }),
      catchError((err: HttpErrorResponse) => {
        console.error(`Erro ao obter preço histórico para ${cleanTicker} em ${formattedDate}:`, err);
        if (err.status === 429) {
          console.warn('Rate limit excedido. Tente novamente em alguns segundos.');
        } else if (err.status === 401) {
          console.error('API Key inválida ou expirada.');
        } else if (err.status === 404) {
          console.warn(`Ticker ${cleanTicker} não encontrado ou data inválida.`);
        }
        return of(null);
      })
    );
  }

  getCompanyInfo(ticker: string): Observable<string | null> {
    const cleanTicker = ticker.trim().toUpperCase();
    
    return this.callStockAPI('quote', { symbol: cleanTicker }).pipe(
      retry(1),
      map((res: QuoteResponse) => {
        if (res.status === 'error' || !res.name) {
          return null;
        }
        return res.name;
      }),
      catchError(err => {
        console.warn(`Erro ao obter informações da empresa para ${cleanTicker}:`, err);
        return of(null);
      })
    );
  }

  validateTicker(ticker: string): Observable<boolean> {
    return this.getCurrentPrice(ticker).pipe(
      map(price => price !== null)
    );
  }
}