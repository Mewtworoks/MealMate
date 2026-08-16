import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface MealReview {
  id: string;
  mealId: string;
  mealName?: string;
  agentId?: string;
  userId?: string;
  userName: string;
  userAvatarBg: string;
  rating: number; // 1-5
  comment: string;
  date: string;
  createdAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private storageKey = 'mealmate_reviews';
  private reviewsSubject = new BehaviorSubject<MealReview[]>([]);
  reviews$ = this.reviewsSubject.asObservable();

  private defaultReviews: MealReview[] = [
    {
      id: 'rev-1',
      mealId: '1',
      mealName: 'Lucknowi Galouti Kebab',
      agentId: '05603423-ff0f-442c-8b8a-b306536cdb7b',
      userName: 'Priya S.',
      userAvatarBg: '#FF7235',
      rating: 5,
      comment: 'Absolutely delicious! Fresh ingredients and perfect spice level. Will order again.',
      date: '1d ago',
      createdAt: Date.now() - 86400000
    },
    {
      id: 'rev-2',
      mealId: '1',
      mealName: 'Lucknowi Galouti Kebab',
      agentId: '05603423-ff0f-442c-8b8a-b306536cdb7b',
      userName: 'Rahul M.',
      userAvatarBg: '#4CAF50',
      rating: 4,
      comment: 'Great portion size and taste. Reminds me of home-cooked food.',
      date: '2d ago',
      createdAt: Date.now() - 172800000
    },
    {
      id: 'rev-3',
      mealId: '1',
      mealName: 'Lucknowi Galouti Kebab',
      agentId: '05603423-ff0f-442c-8b8a-b306536cdb7b',
      userName: 'Neha K.',
      userAvatarBg: '#2196F3',
      rating: 5,
      comment: 'Loved it! The packaging was clean and food was still warm on delivery.',
      date: '3d ago',
      createdAt: Date.now() - 259200000
    }
  ];

  constructor(private http: HttpClient) {
    this.loadReviews();
  }

  private loadReviews() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.reviewsSubject.next(parsed);
          return;
        }
      } catch (e) {
        console.error('Error reading saved reviews', e);
      }
    }

    this.reviewsSubject.next(this.defaultReviews);
    this.saveReviews(this.defaultReviews);
  }

  private saveReviews(reviews: MealReview[]) {
    localStorage.setItem(this.storageKey, JSON.stringify(reviews));
  }

  getReviewsForMeal(mealId: string): MealReview[] {
    const all = this.reviewsSubject.value;
    const mealReviews = all.filter(r => r.mealId === mealId);
    if (mealReviews.length === 0) {
      return [
        {
          id: `rev-default-${mealId}-1`,
          mealId,
          userName: 'Aarav P.',
          userAvatarBg: '#FF7235',
          rating: 5,
          comment: 'Outstanding flavor and extremely fresh ingredients!',
          date: '1d ago',
          createdAt: Date.now() - 86400000
        },
        {
          id: `rev-default-${mealId}-2`,
          mealId,
          userName: 'Simran K.',
          userAvatarBg: '#4CAF50',
          rating: 4.5,
          comment: 'Perfect healthy option with great nutritional value.',
          date: '2d ago',
          createdAt: Date.now() - 172800000
        }
      ];
    }
    return mealReviews;
  }

  getReviewsForAgent(agentId?: string): MealReview[] {
    const all = this.reviewsSubject.value;
    if (!agentId) return all;
    return all.filter(r => !r.agentId || r.agentId === agentId);
  }

  addReview(data: {
    mealId: string;
    mealName?: string;
    agentId?: string;
    userId?: string;
    userName: string;
    rating: number;
    comment: string;
  }): MealReview {
    const avatarColors = ['#FF7235', '#4CAF50', '#2196F3', '#9C27B0', '#E91E63', '#FF9800'];
    const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    const newRev: MealReview = {
      id: `rev-${Date.now()}`,
      mealId: data.mealId,
      mealName: data.mealName,
      agentId: data.agentId || '05603423-ff0f-442c-8b8a-b306536cdb7b',
      userId: data.userId,
      userName: data.userName || 'Anonymous Foodie',
      userAvatarBg: randomColor,
      rating: Math.max(1, Math.min(5, data.rating)),
      comment: data.comment,
      date: 'Just now',
      createdAt: Date.now()
    };

    const current = this.reviewsSubject.value;
    const updated = [newRev, ...current];
    this.reviewsSubject.next(updated);
    this.saveReviews(updated);

    // Sync review to backend database (Meals table ReviewsJson column)
    this.syncReviewToBackend(newRev);

    return newRev;
  }

  private async syncReviewToBackend(review: MealReview) {
    try {
      const baseUrl = environment.apiUrl || 'http://localhost:5000/api';
      const url = `${baseUrl}/meals/${review.mealId}/review`;
      await firstValueFrom(this.http.post(url, {
        id: review.id,
        mealId: review.mealId,
        mealName: review.mealName || '',
        userId: review.userId || '',
        userName: review.userName,
        userAvatarBg: review.userAvatarBg,
        rating: review.rating,
        comment: review.comment,
        date: review.date
      }));
    } catch (e) {
      console.warn('Backend review sync note (saved locally):', e);
    }
  }

  getAverageRatingForMeal(mealId: string): { rating: string; count: number } {
    const list = this.getReviewsForMeal(mealId);
    if (!list || list.length === 0) return { rating: '4.8', count: 42 };
    const sum = list.reduce((acc, r) => acc + r.rating, 0);
    const avg = (sum / list.length).toFixed(1);
    return { rating: avg, count: list.length + 38 };
  }
}
