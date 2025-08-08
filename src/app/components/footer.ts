import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="app-footer">
      <div class="footer-content">

        <!-- Informações de Mercado -->
        <div class="market-info">
          <div class="market-item">
            <span class="market-label">Mercados:</span>
            <span class="market-status open">Abertos</span>
          </div>
          <div class="market-item">
            <span class="market-label">Última atualização:</span>
            <span class="market-time">{{ getCurrentTime() }}</span>
          </div>
          <div class="market-item">
            <span class="market-disclaimer">
              <i class="fas fa-info-circle"></i>
              Os preços podem ter atraso de até 15 minutos
            </span>
          </div>
        </div>

        <!-- Rodapé Inferior -->
        <div class="footer-bottom">
          <div class="footer-copyright">
            <p>&copy; {{ currentYear }} StockTracker. Todos os direitos reservados.</p>
            <p class="legal-text">
              Este site é apenas para fins educacionais. Não constitui aconselhamento financeiro.
            </p>
          </div>
        </div>
      </div>
    </footer>
  `
})
export class FooterComponent {
  currentYear = new Date().getFullYear();

  getCurrentTime(): string {
    return new Date().toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}