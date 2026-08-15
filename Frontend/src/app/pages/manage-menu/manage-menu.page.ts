import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { MealService, Meal } from '../../services/meal.service';
import { AuthService } from '../../services/auth';
import { NavController, ToastController, ActionSheetController } from '@ionic/angular';
import { ThemeService } from '../../services/theme.service';


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
    image: '', 
    type: 'Veg' as any,
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    spiceLevel: 'Medium',
    prepTime: '25 min',
    portionSize: '350g',
    ingredients: '',
    allergens: ''
  };

  searchQuery: string = '';
  selectedCat: string = 'All';
  filteredMeals: Meal[] = [];

  isPopoverOpen = false;
  popoverEvent: any = null;
  selectedMeal: Meal | null = null;
  
  isDeleteModalOpen = false;
  mealToDelete: Meal | null = null;

  constructor(
    public themeService: ThemeService,
    private mealService: MealService,
    private auth: AuthService,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private actionSheetCtrl: ActionSheetController
  ) { }


  async ngOnInit() {
    await this.loadMeals();
  }

  async loadMeals() {
    const agentId = this.auth.userId;
    if (agentId) {
      this.agentMeals = await this.mealService.getMealsByAgent(agentId) as Meal[];
      this.filterMeals();
    }
  }

  selectCategory(cat: string) {
    this.selectedCat = cat;
    this.filterMeals();
  }

  getCatCount(cat: string): number {
    return this.agentMeals.filter(m => m.category === cat).length;
  }

  filterMeals() {
    let temp = [...this.agentMeals];
    
    if (this.selectedCat !== 'All') {
      temp = temp.filter(m => m.category === this.selectedCat);
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      temp = temp.filter(m => 
        m.name.toLowerCase().includes(q) || 
        m.description?.toLowerCase().includes(q)
      );
    }

    this.filteredMeals = temp;
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
      type: 'Veg',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      spiceLevel: 'Medium',
      prepTime: '25 min',
      portionSize: '350g',
      ingredients: '',
      allergens: ''
    };
  }

  openPopover(ev: any, meal: Meal) {
    ev.stopPropagation();
    this.selectedMeal = meal;
    this.popoverEvent = ev;
    this.isPopoverOpen = true;
  }

  handleEditFromPopover() {
    this.isPopoverOpen = false;
    if (this.selectedMeal) {
      this.editMeal(this.selectedMeal);
    }
  }

  handleDeleteFromPopover() {
    this.isPopoverOpen = false;
    if (this.selectedMeal) {
      this.deleteMeal(this.selectedMeal);
    }
  }

  handleStatusFromPopover() {
    this.isPopoverOpen = false;
    if (this.selectedMeal) {
      this.toggleMealAvailability(this.selectedMeal);
      // Optional: Show feedback toast
    }
  }


  async deleteMeal(meal: Meal) {
    this.mealToDelete = meal;
    this.isDeleteModalOpen = true;
  }

  async confirmDelete() {
    if (this.mealToDelete && this.mealToDelete.id) {
      await this.mealService.deleteMeal(this.mealToDelete.id);
      this.isDeleteModalOpen = false;
      this.mealToDelete = null;
      await this.loadMeals();
      const t = await this.toastCtrl.create({ 
        message: 'Meal removed successfully', 
        duration: 2000, 
        color: 'danger',
        position: 'bottom'
      });
      t.present();
    }
  }


  editMeal(meal: Meal) {
    // Open add modal but pre-fill with meal data for "Edit" mode
    this.mealForm = {
      name: meal.name,
      description: meal.description || '',
      price: meal.price,
      category: meal.category,
      image: meal.image,
      type: meal.type,
      calories: meal.calories || 0,
      protein: meal.protein || 0,
      carbs: meal.carbs || 0,
      fat: meal.fat || 0,
      fiber: meal.fiber || 0,
      spiceLevel: meal.spiceLevel || 'Medium',
      prepTime: meal.prepTime || '25 min',
      portionSize: meal.portionSize || '350g',
      ingredients: meal.ingredients || '',
      allergens: meal.allergens || ''
    };
    this.isAddMealModalOpen = true;
  }

  toggleAllergen(allergen: string) {
    const list = this.mealForm.allergens ? this.mealForm.allergens.split(',').map(a => a.trim()).filter(a => a) : [];
    const idx = list.indexOf(allergen);
    if (idx > -1) {
      list.splice(idx, 1);
    } else {
      list.push(allergen);
    }
    this.mealForm.allergens = list.join(', ');
  }

  activeKebabMealId: string | null = null;

  get liveCount(): number {
    return this.agentMeals.filter(m => m.isAvailable !== false).length;
  }

  get outOfStockCount(): number {
    return this.agentMeals.filter(m => m.isAvailable === false).length;
  }

  get avgPrice(): number {
    if (!this.agentMeals.length) return 0;
    const total = this.agentMeals.reduce((acc, m) => acc + (m.price || 0), 0);
    return Math.round(total / this.agentMeals.length);
  }

  get bestSellerName(): string {
    return this.agentMeals.length ? this.agentMeals[0].name : '—';
  }

  toggleMealMenu(meal: Meal, event: Event) {
    event.stopPropagation();
    this.activeKebabMealId = this.activeKebabMealId === meal.id ? null : (meal.id || null);
  }

  toggleMealAvailability(meal: Meal) {
    meal.isAvailable = meal.isAvailable === undefined ? false : !meal.isAvailable;
    this.mealService.updateMeal(meal);
  }
}


