// ============================================================
// RACQUET RETREAT 2027 — settings
// The only file to edit when connecting your own Firebase project.
// Firebase web settings are identifiers, not passwords: they are safe
// in a public repo. firestore.rules is what protects the data.
// ============================================================

// Firebase console → Project settings → General → Your apps → Web app → Config.
// While apiKey says PASTE, the site runs in demo mode with sample ballots.
export const firebaseConfig = {
  apiKey: "PASTE_API_KEY",
  authDomain: "PASTE_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_PROJECT_ID",
  storageBucket: "PASTE_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID",
};

// Who's on the trip. If you change this list, change the same names
// in firestore.rules (the NAMES list near the top) and republish the rules.
export const NAMES = ["Russell", "Ben", "Stephen", "Peter", "Jim"];
