# Conztant Fuel Ledger

Petrol pump management web app — daily duty entry (meter readings, test fuel, stock transfers), tank stock, fuel purchases, credit customers & bowsers, bank accounts, expenses, salary sheets, monthly P&L, activity log and Owner/Manager/Staff logins.

It is a **static site** (plain HTML/CSS/JS, no build step) that stores everything in **Firebase Firestore**, so every device that opens the link sees the same live data.

```
index.html               page shell
css/styles.css           theme (light + dark)
js/app.js                the whole app
js/firebase-config.js    your Firebase project keys  ← the only file you must edit
firestore.rules          database access rules (paste into Firebase console)
.github/workflows/       auto-deploys to GitHub Pages on every push to main
```

## 1. Create the database (Firebase, free tier)

1. Go to <https://console.firebase.google.com> → **Add project** (e.g. `conztant-fuel-ledger`). Google Analytics can be off.
2. **Build → Firestore Database → Create database** → choose the location nearest you (e.g. `asia-south1` Mumbai) → start in **production mode**.
3. **Firestore → Rules** tab → replace the contents with [`firestore.rules`](firestore.rules) → **Publish**.
4. **Build → Authentication → Get started → Sign-in method → Anonymous → Enable → Save.**
5. **Project settings (gear icon) → General → Your apps → `</>` (Web)** → nickname `web` → Register → copy the `firebaseConfig` values into [`js/firebase-config.js`](js/firebase-config.js).
6. Later, after step 2 below gives you a site URL: **Authentication → Settings → Authorized domains → Add domain** → `muhthaha-pixel.github.io`.

## 2. Put it on GitHub and publish

1. Create an empty repository on GitHub (this project uses `muhthaha-pixel/Conztant`; public or private — GitHub Pages works with both on a Pro plan; public on Free).
2. From this folder:

   ```bash
   git init
   git add .
   git commit -m "Conztant Fuel Ledger — initial version"
   git branch -M main
   git remote add origin https://github.com/muhthaha-pixel/Conztant.git
   git push -u origin main
   ```

3. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. The **Deploy to GitHub Pages** workflow runs automatically (see the **Actions** tab). When it's green, the app is live at
   `https://muhthaha-pixel.github.io/Conztant/`.
5. Add that domain to Firebase Authorized domains (step 1.6 above).

Every later `git push` to `main` redeploys within about a minute.

## 3. First run

Open the site. With no users yet it asks you to create the **Owner** account, then go to **Setup** and add tanks → nozzles → staff → today's rates. Add Managers/Staff under **Setup → Users**.

## Running locally

Open `index.html` directly in a browser, or serve the folder (e.g. VS Code "Live Server"). It talks to the same Firestore database as the live site. Add `localhost` to Firebase Authorized domains if anonymous sign-in is refused.

## Security notes

- The Firebase config values are project identifiers, not secrets; access is governed by `firestore.rules`.
- The rules let any client that loaded the app read/write — the in-app Owner/Manager/Staff passwords are a convenience lock, not encryption. Keep the site URL private and don't reuse important passwords.
- Firestore free tier: 50k reads / 20k writes per day — far more than a single station uses.
