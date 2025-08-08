import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FooterComponent } from './components/footer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, FooterComponent],
  template: `
    <nav class="custom-navbar" *ngIf="isLoggedIn">
      <div class="container">
        <a class="navbar-brand text-glow" routerLink="/home">Stock Portfolio</a>
        <div class="navbar-links">
          <a class="nav-link logout-btn" routerLink="/home" routerLinkActive="active">Home</a>
          <a class="nav-link logout-btn" routerLink="/wallet" routerLinkActive="active">Gestão da Carteira</a>
          <button class="nav-link logout-btn" (click)="logout()">
            <i class="fas fa-sign-out-alt"></i>
            Sair
          </button>
        </div>
      </div>
    </nav>
    <div [class.login-container]="!isLoggedIn">
      <router-outlet></router-outlet>
    </div>
    <app-footer *ngIf="isLoggedIn"></app-footer>
  `,
  styles: [`
    .logout-btn {
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      font-size: inherit;
      font-family: inherit;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      transition: background-color 0.3s ease;
    }
    
    .logout-btn:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }
    
    .login-container {
      padding: 0;
      margin: 0;
      width: 100%;
      min-height: 100vh;
    }
  `]
})
export class AppComponent {
  public title = 'stock-tracker';
  
  constructor(private router: Router) {}
  
  get isLoggedIn(): boolean {
    return localStorage.getItem('isLoggedIn') === 'true';
  }
  
  logout(): void {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('rememberUser');
    this.router.navigate(['/login']);
  }
}