import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { MealService, Meal } from '../../services/meal.service';
import { AuthService } from '../../services/auth';
import { NavController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-add-meal',
  templateUrl: './add-meal.page.html',
  styleUrls: ['./add-meal.page.scss'],
  standalone: false
})
export class AddMealPage implements OnInit {
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef;

  mealForm = {
    name: '',
    description: '',
    price: 0,
    category: 'Lunch' as any,
    image: '', 
    type: 'Veg' as any
  };

  isSubmitting = false;

  constructor(
    private mealService: MealService,
    private auth: AuthService,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private router: Router
  ) { }

  ngOnInit() {
  }

  goBack() {
    this.navCtrl.back();
  }

  async saveNewMeal() {
    const agentId = this.auth.userId;
    if (!this.mealForm.name || !this.mealForm.price) {
      const t = await this.toastCtrl.create({ 
        message: 'Please fill name and price', 
        duration: 2000,
        color: 'warning'
      });
      t.present();
      return;
    }

    if (agentId) {
      this.isSubmitting = true;
      try {
        const mealData = {
          ...this.mealForm,
          agentId: agentId
        };
        await this.mealService.addMeal(mealData);
        
        const t = await this.toastCtrl.create({ 
          message: 'Meal added successfully! 🚀', 
          duration: 2000, 
          color: 'success' 
        });
        t.present();

        this.navCtrl.back();
      } catch (error) {
        console.error('Error adding meal', error);
      } finally {
        this.isSubmitting = false;
      }
    }
  }

  triggerImageUpload() {
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.mealForm.image = e.target.result; 
      };
      reader.readAsDataURL(file);
    }
  }
}

