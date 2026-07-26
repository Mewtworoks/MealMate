import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { CartService, CartItem } from '../../services/cart.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cart-pill',
  templateUrl: './cart-pill.component.html',
  styleUrls: ['./cart-pill.component.scss'],
  standalone: false
})
export class CartPillComponent implements OnInit, OnDestroy {
  cartCount = 0;
  cartTotal = 0;
  isVisible = false;

  /** Up to 3 unique meal images to show as thumbnails in the pill */
  cartImages: string[] = [];

  // Animation state
  flyingItems: FlyingItem[] = [];
  burstingItems: BurstItem[] = [];
  pillBounce = false;
  private flyIdCounter = 0;

  /** true after the pill has been shown at least once (skip bounce on subsequent adds) */
  private pillAlreadyShown = false;

  private subs: Subscription[] = [];

  @ViewChild('pillEl', { static: false }) pillEl!: ElementRef;

  constructor(
    private cartService: CartService,
    private router: Router
  ) {}

  ngOnInit() {
    // Subscribe to cart changes — extract images for thumbnails
    this.subs.push(
      this.cartService.cart$.subscribe(items => {
        const newCount = items.length;
        const newTotal = this.cartService.getCartTotal();

        this.cartCount = newCount;
        this.cartTotal = newTotal;
        this.isVisible = newCount > 0;

        // Reset entrance bounce flag when cart empties
        if (newCount === 0) {
          this.pillAlreadyShown = false;
        }

        // Collect up to 3 unique meal images for the pill thumbnails
        this.cartImages = items
          .slice(0, 3)
          .map(i => i.meal.image);
      })
    );

    // Subscribe to add/remove events for animations
    this.subs.push(
      this.cartService.cartEvent$.subscribe(event => {
        if (event.type === 'add') {
          this.triggerFlyIn(event.mealImage, event.mealName);
        } else if (event.type === 'remove-last') {
          this.triggerBurst(event.mealImage, event.mealName);
        }
      })
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  goToCart() {
    this.router.navigate(['/cart']);
  }

  /** Blinkit-style: meal image flies down INTO the pill */
  triggerFlyIn(image: string, name: string) {
    const id = ++this.flyIdCounter;
    const isFirstItem = !this.pillAlreadyShown;
    this.pillAlreadyShown = true;

    const flyItem: FlyingItem = {
      id,
      image,
      name,
      phase: 'flying'
    };
    this.flyingItems.push(flyItem);

    // After fly-in animation completes (500ms), remove flying item
    setTimeout(() => {
      this.flyingItems = this.flyingItems.filter(f => f.id !== id);

      // Only bounce the pill on the very first item added (entrance effect)
      if (isFirstItem) {
        this.pillBounce = true;
        setTimeout(() => this.pillBounce = false, 400);
      }
    }, 500);
  }

  /** Blinkit-style: meal image rises UP from pill and bursts */
  triggerBurst(image: string, name: string) {
    const id = ++this.flyIdCounter;
    const burstItem: BurstItem = {
      id,
      image,
      name,
      phase: 'rising'
    };
    this.burstingItems.push(burstItem);

    // After rise completes (400ms), switch to burst phase
    setTimeout(() => {
      const item = this.burstingItems.find(b => b.id === id);
      if (item) item.phase = 'burst';

      // Remove burst particles after animation
      setTimeout(() => {
        this.burstingItems = this.burstingItems.filter(b => b.id !== id);
      }, 500);
    }, 400);

    // Pill shrink effect
    this.pillBounce = true;
    setTimeout(() => this.pillBounce = false, 400);
  }
}

interface FlyingItem {
  id: number;
  image: string;
  name: string;
  phase: 'flying';
}

interface BurstItem {
  id: number;
  image: string;
  name: string;
  phase: 'rising' | 'burst';
}
