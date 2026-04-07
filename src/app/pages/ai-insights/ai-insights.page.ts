import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-ai-insights',
  templateUrl: './ai-insights.page.html',
  styleUrls: ['./ai-insights.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class AiInsightsPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
