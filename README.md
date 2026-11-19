# Racquet Retreat 2027

The planning site for the February–March 2027 tennis and pickleball weekend. Friends open the link, tap their name, and:

- save a ballot (top 5 resorts, group size, play level, budget, weekends)
- post ideas on the **Idea board** and +1 each other's
- comment on any resort card

Everyone sees everyone's ballots, ideas and comments live, plus **Where we're leaning**: the leading resort, weekend, group size and style, worked out from the ballots.

**Cost: $0.** Firebase free plan (Firestore + anonymous sign-in) and a Render static site.

There are no accounts for friends. The site signs each browser in anonymously in the background, so only visitors to the site can write, and the rules accept only the five names on the trip. Anyone with the link could pick someone else's name, so share the link only with the group.

Until `config.js` has Firebase values, the site runs in demo mode with example ballots.

## Files

```
index.html       page layout and styles
app.js           everything that happens on the page
data.js          the 31 resorts (edit to add or change one)
config.js        Firebase settings and the list of names
firestore.rules  who may write what (pasted into Firebase)
```

## Setup

1. **Firebase project** (signed in with your Gmail): create a project named `racquet-retreat`, with Google Analytics, Gemini and the Developer Program turned off. **+ Add app → Web**, nickname `racquet-retreat-web`, no Hosting. Copy the six config values into `config.js`.
2. **Anonymous sign-in:** Security → Authentication → Get started → Sign-in method → **Anonymous** → Enable → Save.
3. **Database:** Databases & Storage → Firestore → Create database → Standard edition → location `nam5` → production mode. Then the **Rules** tab: paste `firestore.rules` → Publish.
4. **GitHub and Render:** commit and push with GitHub Desktop. Render → New → Static Site → this repo, Build Command blank, Publish Directory `.`.
5. **Authorized domain:** Firebase → Authentication → Settings → Authorized domains → add your `….onrender.com` domain.
6. Send the link to the group.

## Changing the names

Edit `NAMES` in `config.js` and the matching list in `firestore.rules` (function `names()`), then republish the rules.

## Removing something

Friends can delete their own ideas and comments from the same browser they posted from. You can delete anything in Firebase → Firestore → Data.
