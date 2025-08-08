import { Component, ElementRef, ViewChild, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StockService } from '../services/stock.service';
import { Chart, ChartConfiguration, ChartDataset } from 'chart.js/auto';
import { forkJoin } from 'rxjs';

interface Stock {
  ticker: string;
  company: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  profit: number;
  lastUpdate?: Date;
  purchaseDate?: Date;
}

interface Wallet {
  balance: number;
  transactions: { 
    date: Date; 
    amount: number; 
    type: 'deposit' | 'withdrawal' | 'buy' | 'sell';
    ticker?: string;    // Para rastrear qual ação
    quantity?: number;  // Para rastrear quantidade
    price?: number;     // Para rastrear preço unitário na transação
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
  selector: 'app-wallet',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="container py-4">
  <h2 class="animate__animated animate__fadeInDown">Gestão da Carteira</h2>

  <div *ngIf="apiError" class="alert alert-warning">
    {{ apiError }}
  </div>

  <!-- Seção Principal: Cards de Informação e Ações -->
  <div class="row mb-4">
    <!-- Coluna 1: Informações da Carteira -->
    <div class="col-lg-6 mb-3">
      <div class="row">
        <!-- Saldo Atual -->
        <div class="col-md-6 mb-3">
          <div class="card h-100">
            <div class="card-body text-center">
              <h6 class="card-title text-white">Saldo Atual</h6>
              <h4 class="text-primary">{{ wallet.balance | number:'1.2-2' }} USD</h4>
              <small class="text-white">Dinheiro disponível</small>
            </div>
          </div>
        </div>

        <!-- Valor dos Investimentos -->
        <div class="col-md-6 mb-3">
          <div class="card h-100">
            <div class="card-body text-center">
              <h6 class="card-title text-white">Valor dos Investimentos</h6>
              <h4 class="text-info">{{ getCurrentPortfolioValue() | number:'1.2-2' }} USD</h4>
              <small class="text-white">Valor atual das ações</small>
            </div>
          </div>
        </div>

        <!-- Lucro/Prejuízo -->
        <div class="col-md-6 mb-3">
          <div class="card h-100">
            <div class="card-body text-center">
              <h6 class="card-title text-white">Lucro/Prejuízo</h6>
              <h4 [class]="getInvestmentProfitLoss() >= 0 ? 'text-success' : 'text-danger'">
                {{ getInvestmentProfitLoss() >= 0 ? '+' : '' }}{{ getInvestmentProfitLoss() | number:'1.2-2' }} USD
              </h4>
              <small class="text-white">Dos investimentos</small>
            </div>
          </div>
        </div>

        <!-- Património Total -->
        <div class="col-md-6 mb-3">
          <div class="card h-100">
            <div class="card-body text-center">
              <h6 class="card-title text-white">Património Total</h6>
              <h4 class="text-success">{{ getTotalValue() | number:'1.2-2' }} USD</h4>
              <small class="text-white">Saldo + Investimentos</small>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Coluna 2: Ações da Carteira -->
    <div class="col-lg-6 mb-3">
      <div class="row">
        <!-- Adicionar Fundos -->
        <div class="col-md-6 mb-3">
          <div class="card h-100">
            <div class="card-body">
              <h6 class="card-title text-white">Adicionar Fundos</h6>
              <form (ngSubmit)="addFunds()">
                <div class="mb-3">
                  <input 
                    [(ngModel)]="addFundAmount" 
                    name="addFundAmount" 
                    class="form-control" 
                    type="number" 
                    min="0" 
                    step="0.01"
                    placeholder="0.00"
                    required>
                </div>
                <button 
                  type="submit"
                  class="btn btn-success w-100 btn-sm"
                  [disabled]="addFundAmount <= 0">
                  Adicionar
                </button>
              </form>
            </div>
          </div>
        </div>

        <!-- Retirar Fundos -->
        <div class="col-md-6 mb-3">
          <div class="card h-100">
            <div class="card-body">
              <h6 class="card-title text-white">Retirar Fundos</h6>
              <form (ngSubmit)="withdrawFunds()">
                <div class="mb-3">
                  <input 
                    [(ngModel)]="withdrawFundAmount" 
                    name="withdrawFundAmount" 
                    class="form-control" 
                    type="number" 
                    min="0" 
                    step="0.01"
                    placeholder="0.00"
                    required>
                </div>
                <button 
                  type="submit"
                  class="btn btn-warning w-100 btn-sm"
                  [disabled]="withdrawFundAmount <= 0 || withdrawFundAmount > wallet.balance">
                  Retirar
                </button>
              </form>
            </div>
          </div>
        </div>

        <!-- Comprar Ações - Ocupa as duas colunas -->
        <div class="col-12 mb-3">
          <div class="card h-100">
            <div class="card-body">
              <h6 class="card-title text-white">Comprar Ações</h6>
              <form (ngSubmit)="buyStock()">
                <div class="row g-2">
                  <div class="col-6">
                    <input 
                      [(ngModel)]="newStock.ticker" 
                      name="ticker" 
                      class="form-control" 
                      list="tickerOptions" 
                      placeholder="Ticker (Ex: MSFT)" 
                      required
                      (blur)="onTickerBlur()">
                    <datalist id="tickerOptions">
                      <option *ngFor="let ticker of tickerList" [value]="ticker"></option>
                    </datalist>
                  </div>
                  <div class="col-6">
                    <input 
                      [(ngModel)]="newStock.quantity" 
                      name="quantity" 
                      class="form-control" 
                      type="number" 
                      min="1"
                      placeholder="Quantidade" 
                      required>
                  </div>
                </div>
                <div class="mt-2">
                  <button 
                    type="submit"
                    class="btn btn-primary w-100 btn-sm"
                    [disabled]="!isFormValid()">
                    Comprar Ação
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Botão para mostrar/esconder histórico detalhado -->
  <div class="d-flex justify-content-center mb-3">
    <button 
      class="btn btn-outline-info"
      (click)="toggleHistoryTable()">
      <i class="fas fa-history me-2"></i>
      {{ showHistoryTable ? 'Esconder' : 'Ver' }} Histórico Detalhado
    </button>
  </div>

  <!-- Histórico de Transações (Escondido por padrão) -->
  <div class="mt-4" *ngIf="showHistoryTable" [@slideInOut]>
    <h4>Histórico Detalhado de Transações</h4>
    <div class="table-responsive">
      <table class="table table-bordered">
        <thead class="table-dark">
          <tr>
            <th>Data</th>
            <th>Tipo</th>
            <th>Valor da Transação</th>
            <th>Saldo da Carteira</th>
            <th>Valor Total (Carteira + Investimentos)</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let transaction of transactionHistory; let i = index" 
              [class]="i % 2 === 0 ? 'table-light' : ''">
            <td>{{ transaction.date | date:'dd/MM/yyyy HH:mm' }}</td>
            <td>
              <span class="badge" 
                    [class]="getTransactionBadgeClass(transaction.type)">
                {{ getTransactionTypeLabel(transaction.type) }}
              </span>
            </td>
            <td [class]="transaction.amount >= 0 ? 'text-success' : 'text-danger'">
              <strong>{{ transaction.amount >= 0 ? '+' : '' }}{{ transaction.amount | number:'1.2-2' }} USD</strong>
            </td>
            <td class="text-primary">
              <strong>{{ transaction.runningBalance | number:'1.2-2' }} USD</strong>
            </td>
            <td class="text-success">
              <strong>{{ transaction.totalValueAtTime | number:'1.2-2' }} USD</strong>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Estatísticas do histórico -->
    <div class="row mt-3">
      <div class="col-md-3">
        <div class="card bg-light">
          <div class="card-body text-center">
            <small class="text-muted">Total de Transações</small>
            <h5 class="mb-0">{{ transactionHistory.length }}</h5>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card bg-light">
          <div class="card-body text-center">
            <small class="text-muted">Total Depositado</small>
            <h5 class="mb-0 text-success">{{ getTotalDeposited() | number:'1.2-2' }} USD</h5>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card bg-light">
          <div class="card-body text-center">
            <small class="text-muted">Total Retirado</small>
            <h5 class="mb-0 text-warning">{{ getTotalWithdrawn() | number:'1.2-2' }} USD</h5>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card bg-light">
          <div class="card-body text-center">
            <small class="text-muted">Total Investido</small>
            <h5 class="mb-0 text-info">{{ getTotalInvestedFromHistory() | number:'1.2-2' }} USD</h5>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Histórico da Carteira -->
  <div class="mt-4">
   
    <div class="chart-container" style="position: relative; height: 400px; width: 100%;">
       <h4>Evolução da carteira</h4>
      <canvas #balanceChartCanvas style="display: block; box-sizing: border-box; height: 400px; width: 100%;"></canvas>
    </div>
  </div>

  <!-- Gráfico Top 3 Ações em Rosca -->
  <div class="mt-4 ">
    
    <div class="row">
      <div class="col-md-6 offset-md-3">
        <div class="chart-container" style="position: relative; height: 400px; width: 100%;">
          <h4 >Ações populares</h4>
          <canvas #topStocksChartCanvas style="display: block; box-sizing: border-box; height: 400px; width: 100%;"></canvas>
        </div>
      </div>
    </div>
    <div class="text-center mt-2">
      <small class="text-muted">Valores simulados baseados em preços reais das ações mais populares</small>
    </div>
  </div>

</div>
  `
})
export class WalletComponent implements OnInit, AfterViewInit {
  newStock: Partial<Stock> = { ticker: '', company: '', quantity: 0 };
  wallet: Wallet = { balance: 0, transactions: [] };
  addFundAmount: number = 0;
  withdrawFundAmount: number = 0;
  apiError: string = '';
  showHistoryTable: boolean = false; // Nova propriedade para controlar visibilidade
  
  // Nova propriedade para o histórico calculado
  transactionHistory: Array<{
    date: Date;
    type: 'deposit' | 'withdrawal' | 'buy' | 'sell';
    amount: number;
    runningBalance: number;
    portfolioValueAtTime: number;
    totalValueAtTime: number;
  }> = [];
  
  @ViewChild('balanceChartCanvas') balanceChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('topStocksChartCanvas') topStocksChartCanvas!: ElementRef<HTMLCanvasElement>;
  balanceChart: Chart | null = null;
  topStocksChart: Chart | null = null;
  
  tickerList: string[] = [
    'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'TSLA', 'NVDA', 'META', 'AMZN',
    'BABA', 'NFLX', 'AMD', 'INTC', 'CRM', 'ORCL', 'ADBE', 'PYPL',
    'UBER', 'SPOT', 'SQ', 'ZOOM', 'SHOP', 'TWTR', 'SNAP', 'PINS'
  ];

  constructor(private stockService: StockService) {}

  ngOnInit() {
    this.loadWallet();
    this.calculateTransactionHistory();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initializeCharts();
    }, 100);
  }

  // Novo método para alternar visibilidade da tabela
  toggleHistoryTable() {
    this.showHistoryTable = !this.showHistoryTable;
  }

  // Métodos para obter estatísticas do histórico
  getTotalDeposited(): number {
    return this.wallet.transactions
      .filter(t => t.type === 'deposit')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  getTotalWithdrawn(): number {
    return Math.abs(this.wallet.transactions
      .filter(t => t.type === 'withdrawal')
      .reduce((sum, t) => sum + t.amount, 0));
  }

  getTotalInvestedFromHistory(): number {
    return Math.abs(this.wallet.transactions
      .filter(t => t.type === 'buy')
      .reduce((sum, t) => sum + t.amount, 0));
  }

  // Métodos para melhorar a apresentação da tabela
  getTransactionTypeLabel(type: string): string {
    const labels = {
      'deposit': 'Depósito',
      'withdrawal': 'Retirada',
      'buy': 'Compra',
      'sell': 'Venda'
    };
    return labels[type as keyof typeof labels] || type;
  }

  getTransactionBadgeClass(type: string): string {
    const classes = {
      'deposit': 'badge-success',
      'withdrawal': 'badge-warning',
      'buy': 'badge-primary',
      'sell': 'badge-info'
    };
    return classes[type as keyof typeof classes] || 'badge-secondary';
  }

  // Novo método para calcular o histórico correto das transações
  private calculateTransactionHistory() {
    const sortedTransactions = [...this.wallet.transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let runningBalance = 0;
    this.transactionHistory = [];

    sortedTransactions.forEach(transaction => {
      runningBalance += transaction.amount;
      
      const currentPortfolioValue = this.getCurrentPortfolioValue();
      
      this.transactionHistory.push({
        date: transaction.date,
        type: transaction.type,
        amount: transaction.amount,
        runningBalance: runningBalance,
        portfolioValueAtTime: currentPortfolioValue,
        totalValueAtTime: runningBalance + currentPortfolioValue
      });
    });
  }

  initializeCharts() {
    this.updateBalanceChart();
    this.updateTopStocksChart(); // Alterado de updateTrendingStocksChart
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
      this.wallet = {
        balance: 1000,
        transactions: [
          { date: new Date(), amount: 1000, type: 'deposit' }
        ]
      };
      localStorage.setItem('wallet', JSON.stringify(this.wallet));
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

  isFormValid(): boolean {
    return !!(
      this.newStock.ticker?.trim() &&
      this.newStock.quantity && this.newStock.quantity > 0
    );
  }

  onTickerBlur() {
    if (this.newStock.ticker && !this.newStock.company) {
      this.stockService.getCompanyInfo(this.newStock.ticker).subscribe(
        companyName => {
          this.newStock.company = companyName || '';
        },
        error => {
          this.apiError = `Erro ao buscar empresa para ${this.newStock.ticker}`;
          console.error('Company info error:', error);
          setTimeout(() => this.apiError = '', 3000);
        }
      );
    }
  }

  addFunds() {
    if (this.addFundAmount <= 0) {
      this.apiError = 'O valor deve ser maior que zero';
      setTimeout(() => this.apiError = '', 3000);
      return;
    }

    this.wallet.balance += this.addFundAmount;
    this.wallet.transactions.push({
      date: new Date(),
      amount: this.addFundAmount,
      type: 'deposit'
    });

    this.saveWallet();
    this.calculateTransactionHistory();
    this.updateBalanceChart();
    this.addFundAmount = 0;
  }

  withdrawFunds() {
    if (this.withdrawFundAmount <= 0 || this.withdrawFundAmount > this.wallet.balance) {
      this.apiError = 'Valor inválido ou insuficiente';
      setTimeout(() => this.apiError = '', 3000);
      return;
    }

    this.wallet.balance -= this.withdrawFundAmount;
    this.wallet.transactions.push({
      date: new Date(),
      amount: -this.withdrawFundAmount,
      type: 'withdrawal'
    });

    this.saveWallet();
    this.calculateTransactionHistory();
    this.updateBalanceChart();
    this.withdrawFundAmount = 0;
  }

 buyStock() {
  if (!this.isFormValid()) {
    this.apiError = 'Preencha todos os campos obrigatórios';
    setTimeout(() => this.apiError = '', 3000);
    return;
  }

  const ticker = this.newStock.ticker!.trim().toUpperCase();
  this.apiError = '';

  this.stockService.validateTicker(ticker).subscribe(
    isValid => {
      if (!isValid) {
        this.apiError = `Ticker ${ticker} não encontrado`;
        console.error('Invalid ticker:', ticker);
        setTimeout(() => this.apiError = '', 5000);
        return;
      }

      this.stockService.getCurrentPrice(ticker).subscribe(
        currentPrice => {
          if (currentPrice === null) {
            this.apiError = `Não foi possível obter o preço atual para ${ticker}`;
            console.error('Price fetch failed for:', ticker);
            setTimeout(() => this.apiError = '', 5000);
            return;
          }

          const cost = this.newStock.quantity! * currentPrice;
          if (cost > this.wallet.balance) {
            this.apiError = 'Saldo insuficiente para comprar estas ações';
            console.error('Insufficient funds, cost:', cost, 'balance:', this.wallet.balance);
            setTimeout(() => this.apiError = '', 3000);
            return;
          }

          const portfolio: Stock[] = JSON.parse(localStorage.getItem('portfolio') || '[]');
          if (portfolio.find(s => s.ticker === ticker)) {
            this.apiError = `A ação ${ticker} já está na carteira`;
            console.error('Stock already in portfolio:', ticker);
            setTimeout(() => this.apiError = '', 3000);
            return;
          }

          // CORREÇÃO: Salvar o preço de compra corretamente
          const stock: Stock = {
            ticker,
            company: this.newStock.company || '',
            quantity: this.newStock.quantity!,
            purchasePrice: currentPrice, // Preço de compra fixo
            currentPrice: currentPrice,  // Preço atual (será atualizado depois)
            profit: 0,
            lastUpdate: new Date(),
            purchaseDate: new Date() // Data da compra
          };

          portfolio.push(stock);
          localStorage.setItem('portfolio', JSON.stringify(portfolio));

          this.wallet.balance -= cost;
          // CORREÇÃO: Adicionar mais detalhes à transação
          this.wallet.transactions.push({
            date: new Date(),
            amount: -cost,
            type: 'buy',
            ticker: ticker,           // Adicionar ticker
            quantity: this.newStock.quantity!, // Adicionar quantidade
            price: currentPrice       // Adicionar preço unitário
          });

          this.saveWallet();
          this.calculateTransactionHistory();
          this.updateBalanceChart();
          this.resetForm();

          console.log(`Comprou ${this.newStock.quantity} ações de ${ticker} por $${currentPrice.toFixed(2)} cada (total: $${cost.toFixed(2)})`);
        },
        error => {
          this.apiError = `Erro ao obter preço para ${ticker}`;
          console.error('Price fetch error:', error);
          setTimeout(() => this.apiError = '', 5000);
        }
      );
    },
    error => {
      this.apiError = `Erro ao validar ticker ${ticker}`;
      console.error('Ticker validation error:', error);
      setTimeout(() => this.apiError = '', 5000);
    }
  );
}

  resetForm() {
    this.newStock = { ticker: '', company: '', quantity: 0 };
  }

  // MÉTODOS DE CÁLCULO DE LUCRO/PREJUÍZO (CORRETOS)
  getCurrentPortfolioValue(): number {
    const portfolio: Stock[] = JSON.parse(localStorage.getItem('portfolio') || '[]');
    return portfolio.reduce((total, stock) => total + (stock.currentPrice * stock.quantity), 0);
  }

  getTotalInvested(): number {
    const portfolio: Stock[] = JSON.parse(localStorage.getItem('portfolio') || '[]');
    return portfolio.reduce((total, stock) => total + (stock.purchasePrice * stock.quantity), 0);
  }

  getInvestmentProfitLoss(): number {
    return this.getCurrentPortfolioValue() - this.getTotalInvested();
  }

  getTotalValue(): number {
    return this.wallet.balance + this.getCurrentPortfolioValue();
  }

  updateBalanceChart() {
    if (!this.balanceChartCanvas?.nativeElement) {
      console.log('Balance chart canvas not available yet');
      return;
    }

    const ctx = this.balanceChartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      console.error('Failed to get 2D context for chart');
      return;
    }

    if (this.balanceChart) {
      this.balanceChart.destroy();
    }

    const historyData = this.buildRealWalletHistory();
    
    this.createBalanceChart(
      ctx, 
      historyData.dates, 
      historyData.walletBalances, 
      historyData.totalValues
    );
  }

  private buildRealWalletHistory() {
    if (this.wallet.transactions.length === 0) {
      return {
        dates: [new Date().toLocaleDateString()],
        walletBalances: [this.wallet.balance],
        totalValues: [this.getTotalValue()]
      };
    }

    const sortedTransactions = [...this.wallet.transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const dates: string[] = [];
    const walletBalances: number[] = [];
    const totalValues: number[] = [];
    
    let runningBalance = 0;
    const currentPortfolioValue = this.getCurrentPortfolioValue();
    
    sortedTransactions.forEach(transaction => {
      runningBalance += transaction.amount;
      const date = new Date(transaction.date).toLocaleDateString();
      
      dates.push(date);
      walletBalances.push(runningBalance);
      totalValues.push(runningBalance + currentPortfolioValue);
    });

    const today = new Date().toLocaleDateString();
    const lastDate = dates[dates.length - 1];
    
    if (lastDate === today) {
      walletBalances[walletBalances.length - 1] = this.wallet.balance;
      totalValues[totalValues.length - 1] = this.getTotalValue();
    } else {
      dates.push(today);
      walletBalances.push(this.wallet.balance);
      totalValues.push(this.getTotalValue());
    }

    return {
      dates,
      walletBalances,
      totalValues
    };
  }

  createBalanceChart(ctx: CanvasRenderingContext2D, dates: string[], currentBalances: number[], totalValues: number[]) {
    const datasets: ChartDataset<'line', number[]>[] = [
      {
        label: 'Saldo Atual da Carteira (Dinheiro Disponível)',
        data: currentBalances,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        tension: 0.2,
        fill: false,
        borderWidth: 2
      },
      {
        label: 'Valor Total (Saldo + Investimentos)',
        data: totalValues,
        borderColor: 'rgb(83, 221, 172)',
        backgroundColor: 'rgba(83, 221, 172, 0.1)',
        tension: 0.2,
        fill: false,
        borderWidth: 2
      }
    ];

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: { labels: dates, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 20
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function(context) {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                const profitLoss = context.datasetIndex === 1 ? 
                  value - currentBalances[context.dataIndex] : null;
                
                let tooltip = `${label}: $${value.toFixed(2)}`;
                
                if (profitLoss !== null && profitLoss !== 0) {
                  const sign = profitLoss > 0 ? '+' : '';
                  tooltip += ` (${sign}$${profitLoss.toFixed(2)} em investimentos)`;
                }
                
                return tooltip;
              }
            }
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
              text: 'Valor (USD)'
            },
            beginAtZero: false
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
      this.balanceChart = new Chart(ctx, config);
      console.log('Balance chart created successfully');
    } catch (error) {
      console.error('Error creating balance chart:', error);
    }
  }
  // Continuação a partir da linha 810 - Implementação do gráfico rosca Top 3 ações

updateTopStocksChart() {
  // Verifica se o ViewChild está disponível
  if (!this.topStocksChartCanvas?.nativeElement) {
    console.log('Top stocks chart canvas not available yet');
    return;
  }

  const ctx = this.topStocksChartCanvas.nativeElement.getContext('2d');
  if (!ctx) {
    console.error('Failed to get 2D context for top stocks chart');
    return;
  }

  if (this.topStocksChart) {
    this.topStocksChart.destroy();
  }

  // Top 3 ações mais populares
  const topStocks = ['AAPL', 'MSFT', 'NVDA'];
  
  // Busca preços atuais das ações
  const priceRequests = topStocks.map(ticker => 
    this.stockService.getCurrentPrice(ticker)
  );

  forkJoin(priceRequests).subscribe(
    prices => {
      // Calcula valores simulados baseados nos preços reais
      const stockData = topStocks.map((ticker, index) => {
        const currentPrice = prices[index] || 150; // fallback se não conseguir o preço
        // Simula uma quantidade de ações para demonstração
        const simulatedQuantity = Math.floor(Math.random() * 50) + 10;
        const totalValue = currentPrice * simulatedQuantity;
        
        return {
          ticker,
          price: currentPrice,
          quantity: simulatedQuantity,
          value: totalValue
        };
      });

      this.createTopStocksDonutChart(ctx, stockData);
    },
    error => {
      console.error('Error fetching stock prices for donut chart:', error);
      // Criar gráfico com dados simulados em caso de erro
      this.createTopStocksDonutChartWithMockData(ctx, topStocks);
    }
  );
}

createTopStocksDonutChart(ctx: CanvasRenderingContext2D, stockData: any[]) {
  const labels = stockData.map(stock => `${stock.ticker} ($${stock.price.toFixed(2)})`);
  const data = stockData.map(stock => stock.value);
  const total = data.reduce((sum, value) => sum + value, 0);
  
  // Cores vibrantes para o gráfico
  const backgroundColors = [
    '#FF6384', // Rosa vibrante para AAPL
    '#36A2EB', // Azul para MSFT  
    '#4BC0C0'  // Verde-azulado para NVDA
  ];
  
  const borderColors = [
    '#FF4569',
    '#2E8BC0', 
    '#3DA5A5'
  ];

  const config: ChartConfiguration<'doughnut'> = {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 2,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const stock = stockData[context.dataIndex];
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return [
                `${stock.ticker}: $${context.parsed.toFixed(2)}`,
                `${stock.quantity} ações × $${stock.price.toFixed(2)}`,
                `${percentage}% da distribuição`
              ];
            }
          }
        }
      },
      cutout: '60%', // Cria o efeito de rosca
      animation: {
        animateRotate: true,
        animateScale: true
      }
    }
  };

  try {
    this.topStocksChart = new Chart(ctx, config);
    console.log('Top stocks donut chart created successfully');
  } catch (error) {
    console.error('Error creating top stocks donut chart:', error);
  }
}

createTopStocksDonutChartWithMockData(ctx: CanvasRenderingContext2D, tickers: string[]) {
  // Dados simulados para demonstração
  const mockData = tickers.map((ticker, index) => {
    const mockPrices = [180.50, 415.30, 875.20]; // Preços simulados realistas
    const simulatedQuantity = Math.floor(Math.random() * 50) + 10;
    
    return {
      ticker,
      price: mockPrices[index],
      quantity: simulatedQuantity,
      value: mockPrices[index] * simulatedQuantity
    };
  });

  this.createTopStocksDonutChart(ctx, mockData);
}

// Método auxiliar para gerar cores aleatórias (já existente, mas mantido para referência)
randomColor(): string {
  const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
    '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
    '#4BC0C0', '#FF6384', '#36A2EB', '#FFCE56'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Método para obter informações das empresas (opcional, para melhorar o display)
getCompanyNames(): { [key: string]: string } {
  return {
    'AAPL': 'Apple Inc.',
    'MSFT': 'Microsoft Corporation',
    'NVDA': 'NVIDIA Corporation',
    'GOOGL': 'Alphabet Inc.',
    'AMZN': 'Amazon.com Inc.',
    'TSLA': 'Tesla Inc.',
    'META': 'Meta Platforms Inc.'
  };
}

}