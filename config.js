// ============================================================
// RACQUET RETREAT 2027 — settings
// The only file to edit when connecting your own Firebase project.
// Firebase web settings are identifiers, not passwords: they are safe
// in a public repo. firestore.rules is what protects the data.
// ============================================================

// Firebase console → Project settings → General → Your apps → Web app → Config.
// While apiKey says PASTE, the site runs in demo mode with sample ballots.
export const firebaseConfig = {
  apiKey: "AIzaSyD8F7qHx2m3PRxhFQF8AXQV4nIJs7o87pM",
  authDomain: "racquet-retreat.firebaseapp.com",
  projectId: "racquet-retreat",
  storageBucket: "racquet-retreat.firebasestorage.app",
  messagingSenderId: "24844443649",
  appId: "1:24844443649:web:b2c81dcd560587112b6000",
};

// Who's on the trip. If you change this list, change the same names
// in firestore.rules (the NAMES list near the top) and republish the rules.
export const NAMES = ["Russell", "Ben", "Stephen", "Peter", "Jim"];
