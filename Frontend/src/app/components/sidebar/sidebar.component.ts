import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ThemeService } from '../../services/theme.service';

export interface SidebarPlanWidget {
  planName: string;
  percent: number;
  currentDay: number;
  totalDays: number;
}

/**
 * The desktop app shell's left sidebar — logo, role-aware nav (chef vs
 * customer), collapse toggle, optional "active plan" mini-widget, and the
 * profile footer button.
 *
 * Previously this entire block (~90 lines of HTML, ~150 lines of SCSS) was
 * copy-pasted into all 14 desktop page layouts, which is why fixes to it
 * (routerLinkActive, the stale-plan bug, etc.) had to be repeated 14 times.
 * This is the single source of truth going forward.
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, IonicModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  /** Customer footer */
  @Input() userName = '';
  @Input() userInitials = '';

  /** Chef footer */
  @Input() chefName = '';

  /** Orders nav badge (customer only) */
  @Input() orderCount = 0;

  /** Optional "active plan" widget shown above the customer profile footer */
  @Input() planWidget: SidebarPlanWidget | null = null;
  @Output() planWidgetClick = new EventEmitter<void>();

  constructor(public themeService: ThemeService) {}
}
