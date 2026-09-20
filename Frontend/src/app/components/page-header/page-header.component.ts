import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

/**
 * The desktop main-content header — sticky title/subtitle bar, optional back
 * button, and a right-hand slot for whatever page-specific actions a page
 * needs (search box, filter chips, icon buttons, etc. via content
 * projection, since those vary too much per page to model as inputs).
 *
 * Previously this shell (~10-25 lines each) was copy-pasted into all 14
 * desktop page layouts. See components/sidebar/ for the equivalent history
 * on the sidebar — same duplication problem, smaller scale.
 */
@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './page-header.component.html',
  styleUrls: ['./page-header.component.scss']
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() showBack = false;
  @Output() back = new EventEmitter<void>();
}
