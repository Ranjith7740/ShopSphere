import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Navbar } from './shared/navbar/navbar';
import { Router } from '@angular/router';
import { inject } from '@angular/core';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
   private readonly router = inject(Router);

  showCustomerNavbar(): boolean {
    const url = this.router.url;

    return (
      !url.startsWith('/admin') &&
      !url.startsWith('/login') &&
      !url.startsWith('/register')
    );
  }
}
