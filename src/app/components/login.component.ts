import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-background"></div>
      
      <div class="login-card animate__animated animate__fadeInUp">
        <div class="login-header">
          <div class="logo-container">
            <i class="fas fa-chart-line logo-icon"></i>
            <h2 class="logo-text">StockTracker</h2>
          </div>
          <p class="welcome-text">Bem-vindo de volta!</p>
        </div>

        <form (ngSubmit)="onLogin()" class="login-form" #loginForm="ngForm">
          <div class="form-group">
            <label for="email" class="form-label">
              <i class="fas fa-envelope"></i>
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              [(ngModel)]="formData.email"
              class="form-control"
              placeholder="seu@email.com"
              required
              email
              #emailInput="ngModel">
            <div class="error-message" *ngIf="emailInput.invalid && emailInput.touched">
              <small *ngIf="emailInput.errors?.['required']">Email é obrigatório</small>
              <small *ngIf="emailInput.errors?.['email']">Email inválido</small>
            </div>
          </div>

          <div class="form-group">
            <label for="password" class="form-label">
              <i class="fas fa-lock"></i>
              Senha
            </label>
            <div class="password-input-container">
              <input
                [type]="showPassword ? 'text' : 'password'"
                id="password"
                name="password"
                [(ngModel)]="formData.password"
                class="form-control"
                placeholder="••••••••"
                required
                minlength="6"
                #passwordInput="ngModel">
              <button
                type="button"
                class="password-toggle"
                (click)="togglePassword()">
                <i [class]="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
              </button>
            </div>
            <div class="error-message" *ngIf="passwordInput.invalid && passwordInput.touched">
              <small *ngIf="passwordInput.errors?.['required']">Senha é obrigatória</small>
              <small *ngIf="passwordInput.errors?.['minlength']">Senha deve ter pelo menos 6 caracteres</small>
            </div>
          </div>

          <div class="form-options">
            <label class="checkbox-container">
              <input
                type="checkbox"
                name="rememberMe"
                [(ngModel)]="formData.rememberMe">
              <span class="checkmark"></span>
              Lembrar-me
            </label>
            <a href="#" class="forgot-password" (click)="onForgotPassword($event)">
              Esqueceu a senha?
            </a>
          </div>

          <div class="error-message" *ngIf="loginError">
            <i class="fas fa-exclamation-triangle"></i>
            {{ loginError }}
          </div>

          <button
            type="submit"
            class="btn-login"
            [disabled]="loginForm.invalid || isLoading"
            [class.loading]="isLoading">
            <span *ngIf="!isLoading">
              <i class="fas fa-sign-in-alt"></i>
              Entrar
            </span>
            <span *ngIf="isLoading">
              <i class="fas fa-spinner fa-spin"></i>
              Entrando...
            </span>
          </button>
        </form>

        <div class="login-footer">
          <p>Não tem uma conta? 
            <a href="#" class="register-link" (click)="onRegister($event)">
              Criar conta
            </a>
          </p>
        </div>
      </div>
    </div>
`,
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  formData: LoginForm = {
    email: '',
    password: '',
    rememberMe: false
  };

  showPassword: boolean = false;
  isLoading: boolean = false;
  loginError: string = '';

  constructor(private router: Router) {}

  ngOnInit() {
    // Se já estiver logado, redireciona para home
    if (localStorage.getItem('isLoggedIn') === 'true') {
      this.router.navigate(['/home']);
    }

    // Se houver dados salvos (lembrar-me), preenche o formulário
    const rememberUser = localStorage.getItem('rememberUser');
    const savedEmail = localStorage.getItem('userEmail');
    if (rememberUser === 'true' && savedEmail) {
      this.formData.email = savedEmail;
      this.formData.rememberMe = true;
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onLogin() {
    if (this.isLoading) return;

    this.isLoading = true;
    this.loginError = '';

    // Simulação de login - substitua pela sua lógica de autenticação
    setTimeout(() => {
      // Validação simples para demonstração
      if (this.formData.email === 'admin@stocktracker.com' && this.formData.password === '123456') {
        // Login bem-sucedido
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userEmail', this.formData.email);
        
        if (this.formData.rememberMe) {
          localStorage.setItem('rememberUser', 'true');
        } else {
          localStorage.removeItem('rememberUser');
        }

        this.router.navigate(['/home']);
      } else {
        // Login falhado
        this.loginError = 'Email ou senha incorretos. Tente: admin@stocktracker.com / 123456';
      }
      
      this.isLoading = false;
    }, 1500);
  }

  onForgotPassword(event: Event) {
    event.preventDefault();
    alert('Funcionalidade de recuperação de senha será implementada em breve!');
  }

  onRegister(event: Event) {
    event.preventDefault();
    alert('Funcionalidade de registro será implementada em breve!');
  }
}