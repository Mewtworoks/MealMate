import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-page-loader',
  templateUrl: './page-loader.component.html',
  styleUrls: ['./page-loader.component.scss'],
  standalone: false,
  animations: [
    trigger('fadeOut', [
      transition(':leave', [
        animate('0.4s ease-in-out', style({ opacity: 0, transform: 'scale(1.03)' }))
      ])
    ])
  ]
})
export class PageLoaderComponent implements OnInit, OnDestroy {
  /** Controls visibility of the loader overlay */
  @Input() isLoading = true;

  /** Tagline displayed below the logo */
  @Input() tagline = 'Getting things delicious for you...';

  /** Which food bowl is currently "active" — auto-rotates */
  activeBowl = 1;

  private intervalId: any;

  ngOnInit() {
    this.intervalId = setInterval(() => {
      this.activeBowl = (this.activeBowl % 3) + 1;
    }, 1200);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
