import { Component, ElementRef, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StockService } from '../services/stock.service';
import { Chart, ChartConfiguration, ChartDataset } from 'chart.js/auto';
import { forkJoin, interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

interface Stock {
  ticker: string;
  company: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  profit: number;
  lastUpdate?: Date;
  purchaseDate?: Date; // Adicionado para rastrear quando foi comprada
}

interface Wallet {
  balance: number;
  transactions: { 
    date: Date; 
    amount: number; 
    type: 'deposit' | 'withdrawal' | 'buy' | 'sell';
    ticker?: string; // Adicionado para rastrear qual ação foi comprada/vendida
    quantity?: number; // Adicionado para rastrear quantidade
    price?: number; // Adicionado para rastrear preço na transação
  }[];
}

interface HistoricalData {
  dates: string[];
  prices: number[];
}

interface CustomDataset extends ChartDataset<'line', number[]> {
  label: string;
  data: number[];
  borderColor: string;
  fill: boolean;
  tension: number;
}

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container py-4">
      <h2 class="animate__animated animate__fadeInDown">Carteira de Ações</h2>

      <div *ngIf="apiError" class="alert alert-warning">
        {{ apiError }}
      </div>

      <!-- Resumo da carteira -->
      <div class="row mb-4" *ngIf="portfolio.length > 0 || wallet.balance > 0">
        <div class="col-md-3">
          <div class="card bg-primary text-white">
            <div class="card-body">
              <h5>Saldo da Carteira</h5>
              <h3>{{ wallet.balance | number:'1.2-2' }} USD</h3>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card bg-info text-white">
            <div class="card-body">
              <h5>Total Investido</h5>
              <h3>{{ getTotalInvested() | number:'1.2-2' }} USD</h3>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card bg-info text-white">
            <div class="card-body">
              <h5>Valor Atual</h5>
              <h3>{{ getCurrentValue() | number:'1.2-2' }} USD</h3>
            </div>
          </div>
        </div>
        <div class="col-md-3 mx-auto">
          <div 
            class="card text-white"
            [style.background]="getTotalProfit() >= 0 ? 'var(--bs-success)' : 'var(--bs-danger)'"
          >
            <div class="card-body text-center">
              <h5>Lucro/Prejuízo Total</h5>
              <h3>{{ getTotalProfit() | number:'1.2-2' }} USD</h3>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabela -->
      <div class="table-responsive">
        <table class="table table-bordered table-striped">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Empresa</th>
              <th>Qtd</th>
              <th>Compra</th>
              <th>Atual</th>
              <th>Lucro/Prejuízo</th>
              <th>%</th>
              <th>Última Atualização</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let stock of portfolio; trackBy: trackByTicker">
              <td><strong>{{ stock.ticker }}</strong></td>
              <td>{{ stock.company || '-' }}</td>
              <td>{{ stock.quantity }}</td>
              <td>{{ stock.purchasePrice | number:'1.2-2' }} USD</td>
              <td>
                <span *ngIf="stock.currentPrice > 0">{{ stock.currentPrice | number:'1.2-2' }} USD</span>
                <span *ngIf="stock.currentPrice === 0" class="text-muted">Carregando...</span>
              </td>
              <td [ngClass]="{'text-success': stock.profit >= 0, 'text-danger': stock.profit < 0}">
                <strong>{{ stock.profit | number:'1.2-2' }} USD</strong>
              </td>
              <td [ngClass]="{'text-success': getProfitPercentage(stock) >= 0, 'text-danger': getProfitPercentage(stock) < 0}">
                <strong>{{ getProfitPercentage(stock) | number:'1.2-2' }}%</strong>
              </td>
              <td class="text small">
                <span *ngIf="stock.lastUpdate">{{ stock.lastUpdate | date:'short' }}</span>
                <span *ngIf="!stock.lastUpdate">-</span>
              </td>
              <td>
                <button class="btn btn-sm btn-outline-secondary me-1" (click)="showChart(stock.ticker)">
                  Ver Gráfico
                </button>
                <button class="btn btn-sm btn-outline-secondary me-1" (click)="refreshStock(stock)">
                  🔄
                </button>
                <button class="btn btn-sm btn-outline-danger me-1" (click)="sellStock(stock)" [disabled]="isLoading">
                  Vender
                </button>
                <button class="btn btn-sm btn-outline-danger" (click)="removeStock(stock.ticker)">
                  🗑️
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="portfolio.length === 0 && wallet.balance === 0" class="text-center py-5 text-muted">
        <h4>Carteira vazia</h4>
        <p>Adicione dinheiro à carteira ou compre ações na página de Gestão da Carteira</p>
      </div>

      <!-- Gráfico de Preços das Ações -->
      <div class="mt-5" *ngIf="portfolio.length > 0">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h4 *ngIf="selectedTicker">Variação de {{ selectedTicker }}</h4>
          <h4 *ngIf="!selectedTicker">Variação Geral da Carteira</h4>
          <button 
            *ngIf="selectedTicker" 
            class="btn btn-outline-secondary btn-sm" 
            (click)="showGeneralChart()">
            Ver Gráfico Geral
          </button>
        </div>
        <div class="chart-container" style="position: relative; height: 400px;">
          <canvas #chartCanvas></canvas>
        </div>
      </div>

      <!-- Controles -->
      <div class="mt-4 d-flex gap-2 flex-wrap" *ngIf="portfolio.length > 0 || wallet.balance > 0">
        <button class="btn btn-outline-primary" (click)="refreshAllPrices()">
          <span *ngIf="isLoading" class="spinner-border spinner-border-sm me-1"></span>
          Atualizar Preços
        </button>
        <button class="btn btn-outline-success" (click)="exportCSV()">
         Exportar CSV
        </button>
        <button class="btn btn-outline-warning" (click)="clearPortfolio()" 
                onclick="return confirm('Tem certeza que deseja limpar toda a carteira?')">
          Limpar Carteira
        </button>
      </div>

      <!-- Auto-refresh toggle -->
      <div class="mt-3">
        <div class="form-check">
          <input 
            class="form-check-input" 
            type="checkbox" 
            id="autoRefresh"
            [(ngModel)]="autoRefreshEnabled"
            (change)="toggleAutoRefresh()">
          <label class="form-check-label" for="autoRefresh">
            Atualização automática (a cada 5 minutos)
          </label>
        </div>
      </div>
    </div>
  `
})
export class PortfolioComponent implements OnInit, OnDestroy {
  portfolio: Stock[] = [];
  wallet: Wallet = { balance: 0, transactions: [] };
  selectedTicker: string = '';
  isLoading: boolean = false;
  apiError: string = '';
  autoRefreshEnabled: boolean = false;

  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  chart: Chart | null = null;

  private autoRefreshSubscription?: Subscription;

  constructor(private stockService: StockService) {}

  ngOnInit() {
    this.loadPortfolio();
    this.loadWallet();
    setTimeout(() => {
      if (this.portfolio.length > 0) {
        this.showGeneralChart();
      }
    }, 2000);
  }

  ngOnDestroy() {
    if (this.autoRefreshSubscription) {
      this.autoRefreshSubscription.unsubscribe();
    }
    if (this.chart) this.chart.destroy();
  }

  loadPortfolio() {
    const stored = localStorage.getItem('portfolio');
    if (stored) {
      try {
        this.portfolio = JSON.parse(stored);
        console.log('Portfolio loaded from localStorage:', this.portfolio);
        this.portfolio.forEach(stock => this.updateCurrentPrice(stock));
      } catch (error) {
        console.error('Error parsing portfolio from localStorage:', error);
        this.portfolio = [];
        localStorage.setItem('portfolio', JSON.stringify(this.portfolio));
      }
    } else {
      console.log('No portfolio data in localStorage, initializing with default');
      localStorage.setItem('portfolio', JSON.stringify(this.portfolio));
    }
  }

  loadWallet() {
    const stored = localStorage.getItem('wallet');
    if (stored) {
      try {
        const parsedWallet = JSON.parse(stored);
        this.wallet = {
          ...parsedWallet,
          transactions: parsedWallet.transactions.map((t: any) => ({
            ...t,
            date: new Date(t.date)
          }))
        };
        console.log('Wallet loaded from localStorage:', this.wallet);
      } catch (error) {
        console.error('Error parsing wallet from localStorage:', error);
        this.wallet = { balance: 0, transactions: [] };
        localStorage.setItem('wallet', JSON.stringify(this.wallet));
      }
    } else {
      console.log('No wallet data in localStorage, initializing with default');
      localStorage.setItem('wallet', JSON.stringify(this.wallet));
    }
  }

  savePortfolio() {
    try {
      const data = JSON.stringify(this.portfolio);
      localStorage.setItem('portfolio', data);
      console.log('Portfolio saved to localStorage:', this.portfolio);
    } catch (error) {
      this.apiError = 'Error saving portfolio to localStorage';
      console.error('Save portfolio error:', error);
      setTimeout(() => this.apiError = '', 5000);
    }
  }

  saveWallet() {
    try {
      const data = JSON.stringify(this.wallet);
      localStorage.setItem('wallet', data);
      console.log('Wallet saved to localStorage:', this.wallet);
    } catch (error) {
      this.apiError = 'Error saving wallet to localStorage';
      console.error('Save wallet error:', error);
      setTimeout(() => this.apiError = '', 3000);
    }
  }

  updateCurrentPrice(stock: Stock) {
  this.stockService.getCurrentPrice(stock.ticker).subscribe(price => {
    if (price !== null) {
      // CORREÇÃO: Manter o purchasePrice original e só atualizar currentPrice
      stock.currentPrice = price;
      // CORREÇÃO: Calcular lucro baseado no preço de compra original
      stock.profit = (price - stock.purchasePrice) * stock.quantity;
      stock.lastUpdate = new Date();
      this.savePortfolio();
    } else {
      console.warn(`Preço nulo para ${stock.ticker}, usando último valor: ${stock.currentPrice}`);
    }
  }, error => {
    this.apiError = `Erro ao atualizar preço de ${stock.ticker}`;
    console.error('Erro ao atualizar preço:', error);
    setTimeout(() => this.apiError = '', 5000);
  });
}

  sellStock(stock: Stock) {
    if (confirm(`Deseja vender ${stock.quantity} ações de ${stock.ticker}?`)) {
      this.isLoading = true;
      this.stockService.getCurrentPrice(stock.ticker).subscribe(price => {
        if (price !== null) {
          const saleValue = price * stock.quantity;
          
          this.wallet.balance += saleValue;
          
          this.wallet.transactions.push({
            date: new Date(),
            amount: saleValue,
            type: 'sell',
            ticker: stock.ticker,
            quantity: stock.quantity,
            price: price
          });
          
          this.portfolio = this.portfolio.filter(s => s.ticker !== stock.ticker);
          
          this.savePortfolio();
          this.saveWallet();
          
          if (this.selectedTicker === stock.ticker) {
            this.showGeneralChart();
          }
          
          console.log(`Vendido ${stock.quantity} ações de ${stock.ticker} por $${saleValue.toFixed(2)}`);
        }
        this.isLoading = false;
      }, error => {
        this.apiError = `Erro ao obter preço para venda de ${stock.ticker}`;
        this.isLoading = false;
        console.error('Sell price error:', error);
      });
    }
  }

  refreshStock(stock: Stock) {
    this.updateCurrentPrice(stock);
  }

  refreshAllPrices() {
    this.isLoading = true;
    this.portfolio.forEach(stock => this.updateCurrentPrice(stock));
    setTimeout(() => this.isLoading = false, 2000);
  }

  removeStock(ticker: string) {
    this.portfolio = this.portfolio.filter(s => s.ticker !== ticker);
    this.savePortfolio();
    if (this.selectedTicker === ticker) {
      this.showGeneralChart();
    }
  }

  clearPortfolio() {
    this.portfolio = [];
    this.wallet = { balance: 0, transactions: [] };
    this.savePortfolio();
    this.saveWallet();
    if (this.chart) this.chart.destroy();
  }

  trackByTicker(index: number, stock: Stock): string {
    return stock.ticker;
  }

  getTotalInvested(): number {
    return this.portfolio.reduce((total, stock) => total + (stock.purchasePrice * stock.quantity), 0);
  }

  getCurrentValue(): number {
    return this.portfolio.reduce((total, stock) => total + (stock.currentPrice * stock.quantity), 0);
  }

  getTotalProfit(): number {
    return this.portfolio.reduce((total, stock) => total + stock.profit, 0);
  }

  getProfitPercentage(stock: Stock): number {
    if (stock.purchasePrice === 0) return 0;
    return ((stock.currentPrice - stock.purchasePrice) / stock.purchasePrice) * 100;
  }

  toggleAutoRefresh() {
    if (this.autoRefreshEnabled) {
      this.autoRefreshSubscription = interval(5 * 60 * 1000).pipe(
        switchMap(() => {
          this.refreshAllPrices();
          return [];
        })
      ).subscribe();
    } else {
      if (this.autoRefreshSubscription) {
        this.autoRefreshSubscription.unsubscribe();
      }
    }
  }

  showChart(ticker: string) {
    this.selectedTicker = ticker;
    this.stockService.getHistoricalData(ticker).subscribe(data => {
      if (!data) {
        this.apiError = `Não foi possível carregar dados históricos para ${ticker}`;
        setTimeout(() => this.apiError = '', 5000);
        return;
      }
      
      const datasets: CustomDataset[] = [{
        label: `Preço - ${ticker}`,
        data: data.prices,
        borderColor: 'rgb(83, 221, 172)',
        backgroundColor: 'rgba(83, 221, 172, 0.1)',
        tension: 0.2,
        fill: true
      }];

      this.createStockChart(data.dates, datasets);
    }, error => {
      this.apiError = `Erro ao carregar histórico para ${ticker}`;
      console.error('Chart data error:', error);
    });
  }

  showGeneralChart() {
    if (this.portfolio.length === 0) return;
    
    const allTickers = this.portfolio.map(stock => stock.ticker);
    this.selectedTicker = '';
    
    const requests = allTickers.map(ticker => this.stockService.getHistoricalData(ticker));

    forkJoin(requests).subscribe(results => {
      const datasets = results
        .map((data, index) => {
          if (!data) return null;
          return {
            label: allTickers[index] || 'Desconhecido',
            data: data.prices,
            borderColor: this.randomColor(),
            fill: false,
            tension: 0.3
          } as CustomDataset;
        })
        .filter((d): d is CustomDataset => d !== null);

      if (datasets.length === 0) {
        this.apiError = 'Não foi possível carregar dados históricos';
        setTimeout(() => this.apiError = '', 5000);
        return;
      }

      const labels = results.find(r => r !== null)?.dates || [];
      this.createStockChart(labels, datasets);
    }, error => {
      this.apiError = 'Erro ao carregar dados históricos gerais';
      console.error('General chart error:', error);
    });
  }

  private createStockChart(labels: string[], datasets: CustomDataset[]) {
    if (!this.chartCanvas) {
      console.error('Chart canvas not found');
      return;
    }
    
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (this.chart) this.chart.destroy();
    
    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            mode: 'index',
            intersect: false,
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Data'
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Preço (USD)'
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      }
    };

    try {
      this.chart = new Chart(ctx!, config);
      console.log('Stock chart created');
    } catch (error) {
      this.apiError = 'Erro ao criar gráfico de ações';
      console.error('Stock chart error:', error);
    }
  }

  randomColor(): string {
    const colors = [
      '#00ffff', '#39ff14', '#ffaa00', '#ff00ff', 
      '#ff3333', '#00ffcc', '#ff6b6b', '#4ecdc4', 
      '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  exportCSV() {
    let csv = 'Ticker,Empresa,Quantidade,Preço de Compra (USD),Preço Atual (USD),Lucro/Prejuízo (USD),Percentual (%),Última Atualização\n';
    
    this.portfolio.forEach(stock => {
      const percentage = this.getProfitPercentage(stock).toFixed(2);
      const lastUpdate = stock.lastUpdate ? stock.lastUpdate.toLocaleString() : '-';
      csv += `${stock.ticker},"${stock.company}",${stock.quantity},${stock.purchasePrice.toFixed(2)},${stock.currentPrice.toFixed(2)},${stock.profit.toFixed(2)},${percentage}%,"${lastUpdate}"\n`;
    });

    csv += '\n--- RESUMO ---\n';
    csv += `Saldo da Carteira,${this.wallet.balance.toFixed(2)} USD\n`;
    csv += `Total Investido,${this.getTotalInvested().toFixed(2)} USD\n`;
    csv += `Valor Atual,${this.getCurrentValue().toFixed(2)} USD\n`;
    csv += `Lucro/Prejuízo Total,${this.getTotalProfit().toFixed(2)} USD\n`;

    csv += '\n--- HISTÓRICO DE TRANSAÇÕES ---\n';
    csv += 'Data,Tipo,Ticker,Quantidade,Preço Unitário,Valor Total,Saldo Carteira Após\n';
    
    let runningBalance = 0;
    this.wallet.transactions.forEach(transaction => {
      runningBalance += transaction.amount;
      const type = transaction.type === 'deposit' ? 'Depósito' :
                   transaction.type === 'withdrawal' ? 'Retirada' :
                   transaction.type === 'buy' ? 'Compra' : 'Venda';
      
      const ticker = transaction.ticker || '-';
      const quantity = transaction.quantity || '-';
      const unitPrice = transaction.price ? transaction.price.toFixed(2) : '-';
      
      csv += `"${new Date(transaction.date).toLocaleString()}","${type}","${ticker}","${quantity}","${unitPrice}","${transaction.amount.toFixed(2)} USD","${runningBalance.toFixed(2)} USD"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `carteira_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }
}