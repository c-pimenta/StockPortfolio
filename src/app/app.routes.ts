import { Routes } from '@angular/router';
import { PortfolioComponent } from './components/portfolio.component';
import { WalletComponent } from './components/wallet.component';
import { LoginComponent } from './components/login.component';
import { AuthGuard } from './guards/auth.guards';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { 
    path: 'home', 
    component: PortfolioComponent,
    canActivate: [AuthGuard]
  },
  { 
    path: 'wallet', 
    component: WalletComponent,
    canActivate: [AuthGuard]
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' } // Rota curinga para páginas não encontradas
];