import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { MealService, Meal } from '../../services/meal.service';
import { AuthService } from '../../services/auth';
import { NavController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-manage-menu',
  templateUrl: './manage-menu.page.html',
  styleUrls: ['./manage-menu.page.scss'],
  standalone: false
})
export class ManageMenuPage implements OnInit {
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef;

  agentMeals: Meal[] = [];
  isAddMealModalOpen = false;

  mealForm = {
    name: '',
    description: '',
    price: 0,
    category: 'Lunch' as any,
    image: '', // Will store Base64 or URL
    type: 'Veg' as any
  };

  constructor(
    private mealService: MealService,
    private auth: AuthService,
    private navCtrl: NavController,
    private toastCtrl: ToastController
  ) { }

  async ngOnInit() {
    await this.loadMeals();
  }

  async loadMeals() {
    const agentId = this.auth.userId;
    if (agentId) {
      this.agentMeals = await this.mealService.getMealsByAgent(agentId) as Meal[];
    }
  }

  goBack() {
    this.navCtrl.back();
  }

  async saveNewMeal() {
    const agentId = this.auth.userId;
    if (!this.mealForm.name || !this.mealForm.price) {
      const t = await this.toastCtrl.create({ message: 'Please fill name and price', duration: 2000 });
      t.present();
      return;
    }
    if (agentId) {
      const mealData = {
        ...this.mealForm,
        agentId: agentId
      };
      await this.mealService.addMeal(mealData);

      const t = await this.toastCtrl.create({ message: 'Meal added successfully!', duration: 2000, color: 'success' });
      t.present();

      await this.loadMeals();
      this.isAddMealModalOpen = false;
      this.resetMealForm();
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
        this.mealForm.image = e.target.result; // Data URL for preview
      };
      reader.readAsDataURL(file);
    }
  }

  resetMealForm() {
    this.mealForm = {
      name: '',
      description: '',
      price: 0,
      category: 'Lunch',
      image: '',
      type: 'Veg'
    };
  }

  toggleMealAvailability(meal: Meal) {
    if (meal.isAvailable === undefined) {
      meal.isAvailable = false;
    } else {
      meal.isAvailable = !meal.isAvailable;
    }
    // Update API if needed
  }
}
