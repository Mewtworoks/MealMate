// Runs before `ng build` on Netlify. Writes environment.prod.ts using real
// secrets from Netlify's environment variables (Site configuration >
// Environment variables), so real keys never have to live in a committed
// file. Any variable left unset falls back to the existing placeholder /
// public value, so this is safe to run locally too.
const fs = require('fs');
const path = require('path');

// environment.ts is gitignored (it holds real local secrets), so a fresh
// clone — like Netlify's build server — never has it. Angular's production
// build config swaps its content for environment.prod.ts via fileReplacements,
// but that mechanism still requires the source file to physically exist on
// disk first, regardless of what's in it. Create it from the template if
// it's missing so the build doesn't fail before it even starts.
const environmentsDir = path.join(__dirname, '..', 'src', 'environments');
const devEnvPath = path.join(environmentsDir, 'environment.ts');
if (!fs.existsSync(devEnvPath)) {
  fs.copyFileSync(path.join(environmentsDir, 'environment.template.ts'), devEnvPath);
  console.log('environment.ts was missing (gitignored) — created it from environment.template.ts.');
}

// Only actually regenerate the file on Netlify's CI (which always sets
// NETLIFY=true) or when a real secret is explicitly present. Local builds
// leave the committed placeholder file untouched, so `git status` doesn't
// get dirtied by every `ng build`.
const isNetlify = !!process.env.NETLIFY;
const hasRealSecret = !!process.env.FIREBASE_API_KEY || !!process.env.GEMINI_API_KEY || !!process.env.CLERK_PUBLISHABLE_KEY;
if (!isNetlify && !hasRealSecret) {
  console.log('Skipping environment.prod.ts generation (not on Netlify, no secrets set).');
  process.exit(0);
}

const env = (name, fallback) => process.env[name] || fallback;

const config = {
  production: true,
  apiUrl: env('API_URL', 'https://mealmate-hokz.onrender.com/api'),
  phpApiUrl: env('PHP_API_URL', 'https://mealmate-laravel-api.onrender.com/api'),
  clerkPublishableKey: env('CLERK_PUBLISHABLE_KEY', 'pk_test_YOUR_CLERK_KEY'),
  geminiApiKey: env('GEMINI_API_KEY', 'YOUR_GEMINI_API_KEY'),
  // groqApiKey is deliberately NOT read from a real env var here — Groq
  // calls go through netlify/functions/groq-chat.js in production, which
  // reads GROQ_API_KEY server-side. Keeping this a permanent placeholder
  // means the real key never ends up in the client bundle at all.
  groqApiKey: 'YOUR_GROQ_API_KEY',
  firebase: {
    apiKey: env('FIREBASE_API_KEY', 'YOUR_API_KEY'),
    authDomain: env('FIREBASE_AUTH_DOMAIN', 'YOUR_AUTH_DOMAIN'),
    databaseURL: env('FIREBASE_DATABASE_URL', 'https://your-database.firebaseio.com'),
    projectId: env('FIREBASE_PROJECT_ID', 'YOUR_PROJECT_ID'),
    storageBucket: env('FIREBASE_STORAGE_BUCKET', 'YOUR_STORAGE_BUCKET'),
    messagingSenderId: env('FIREBASE_MESSAGING_SENDER_ID', 'YOUR_SENDER_ID'),
    appId: env('FIREBASE_APP_ID', 'YOUR_APP_ID')
  }
};

const out = `// AUTO-GENERATED at build time by scripts/generate-env-prod.js — do not edit
// by hand, and do not commit real values here. See that script for the list
// of environment variables it reads.
export const environment = ${JSON.stringify(config, null, 2)};
`;

const outPath = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');
fs.writeFileSync(outPath, out);
console.log('Generated environment.prod.ts from environment variables.');
