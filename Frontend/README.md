<div align="center">
  <img src="https://raw.githubusercontent.com/Mewtworoks/MealMate/main/assets/logo.png" alt="MealMate Logo" width="200" />

  <h1>🍱 MealMate</h1>
  <p><strong>Smart, subscription-based daily meal delivery & personal health tracking platform.</strong></p>

  <p>
    <a href="https://ionicframework.com/"><img src="https://img.shields.io/badge/Ionic-3880FF?style=for-the-badge&logo=ionic&logoColor=white" alt="Ionic" /></a>
    <a href="https://angular.io/"><img src="https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white" alt="Angular" /></a>
    <a href="https://dotnet.microsoft.com/"><img src="https://img.shields.io/badge/.NET_Core-512BD4?style=for-the-badge&logo=dotnet&logoColor=white" alt=".NET Core" /></a>
    <a href="https://cloud.google.com/"><img src="https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white" alt="GCP" /></a>
  </p>
</div>

---

## 📖 About MealMate
**MealMate** is a modern, personalized meal subscription platform designed for those who want healthy, delicious food delivered on a consistent schedule without the daily hassle of ordering. Whether you have specific health goals or just want diverse, curated meals, MealMate takes care of your dietary needs intelligently.

## 🌟 Overview
**MealMate** is a modern, personalized meal subscription app designed to make healthy eating effortless. It combines AI-driven food recommendations with a robust automated delivery system and integrated health tracking.

The app features a warm, energetic design system built from the ground up to provide a premium user experience, complete with an offline-first "Khata" (Ledger) system, automated daily meal rotations, and real-time caloric tracking.

## ✨ Key Features
*   **🤖 AI Picks & Personalization**: Curated daily recommendations based on your taste profile and health goals (e.g., Healthy, North Indian, High Protein).
*   **📅 Automated Meal Rotations**: Seamless 4-day repeating meal cycles tailored to your subscription plan.
*   **💳 MealMate Wallet (Khata)**: Built-in virtual ledger to track balances, meal credits, reward points, and weekly delivery completion.
*   **📊 Health Tracker & Analytics**: Monitor daily caloric intake, macronutrients (like Protein), and weekly consistency streaks.
*   **📍 Localized Delivery System**: Location-aware dynamic headers and personalized daily delivery status updates.
*   **🔐 Seamless Authentication**: Integrated Google OAuth 2.0 secure sign-in.

## 💻 Tech Stack
The MealMate ecosystem is built with a modern, scalable architecture:

### Frontend (Client)
*   **Framework**: Ionic Angular (Cross-platform Web/Mobile)
*   **Language**: TypeScript, HTML, Vanilla SCSS (Global Design System)
*   **Hosting**: Netlify
*   **Maps/Routing**: Leaflet.js

### Backend (API & Services)
*   **Framework**: C# (.NET Core)
*   **Database**: Entity Framework with SQL Server
*   **Cloud Infrastructure**: Google Cloud Platform (GCP Cloud Run)
*   **Storage**: Firebase/Google Cloud Storage (for asset hosting)

---

## 📸 Screenshots

*(To display these screenshots, create an `assets` folder in your repository and upload your images as `home.png`, `meal-plan.png`, and `health-tracker.png`)*

<div align="center">
  <img src="assets/home.png" alt="Home Dashboard" width="250" />
  &nbsp;&nbsp;&nbsp;
  <img src="assets/meal-plan.png" alt="Meal Plan Rotation" width="250" />
  &nbsp;&nbsp;&nbsp;
  <img src="assets/health-tracker.png" alt="Health Tracker" width="250" />
</div>

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   Angular CLI (`npm install -g @angular/cli`)
*   Ionic CLI (`npm install -g @ionic/cli`)
*   .NET SDK (for backend setup)

### Frontend Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/Mewtworoks/MealMate.git
   ```
2. Navigate to the Frontend directory:
   ```bash
   cd MealMate/Frontend
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the development server:
   ```bash
   ionic serve
   ```
   *The app will automatically reload if you change any of the source files.*

### Building for Production
Run the following command to generate the production build (ready for Netlify deployment):
```bash
npm run build
```
*(This project includes a `netlify.toml` for automated deployments and SPA routing)*

---

## 🎨 Design System
MealMate follows a strict DRY (Don't Repeat Yourself) principle for styling. The core aesthetic (including the signature `#FF7235` orange gradients, border radiuses, and dynamic micro-badges) is managed via global SCSS tokens to ensure UI consistency across all pages.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/Mewtworoks/MealMate/issues).
