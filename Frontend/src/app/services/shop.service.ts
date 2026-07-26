import { Injectable } from '@angular/core';

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
}

export interface Category {
  name: string;
  isMixAllowed: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ShopService {
  private categories: Category[] = [
    { name: 'Groceries', isMixAllowed: true },
    { name: 'Electronics', isMixAllowed: false },
    { name: 'Fashion', isMixAllowed: false },
    { name: 'Stationery', isMixAllowed: false }
  ];

  private products: Product[] = [
    { id: 1, name: 'Premium Rice (5kg)', category: 'Groceries', price: 450, image: 'assets/products/rice.png' },
    { id: 2, name: 'Cooking Oil (2L)', category: 'Groceries', price: 320, image: 'assets/products/oil.png' },
    { id: 3, name: 'Organic Honey (500g)', category: 'Groceries', price: 210, image: 'assets/products/honey.png' },
    { id: 4, name: 'Wireless Headphones', category: 'Electronics', price: 1250, image: 'assets/products/headphones.png' },
    { id: 5, name: 'Smart Watch (Series 9)', category: 'Electronics', price: 3400, image: 'assets/products/watch.png' },
    { id: 6, name: 'Cotton T-Shirt', category: 'Fashion', price: 550, image: 'assets/products/tshirt.png' },
    { id: 7, name: 'Denim Jeans (Blue)', category: 'Fashion', price: 1100, image: 'assets/products/jeans.png' },
    { id: 8, name: 'Notebook (Pack of 5)', category: 'Stationery', price: 150, image: 'assets/products/notebook.png' },
    { id: 9, name: 'Luxury Pen Set', category: 'Stationery', price: 850, image: 'assets/products/pen.png' }
  ];

  constructor() { }

  getProducts(): Product[] {
    return this.products;
  }

  getCategories(): Category[] {
    return this.categories;
  }

  getProductsByCategory(category: string): Product[] {
    return this.products.filter(p => p.category === category);
  }
}
