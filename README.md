# Conztant Fuel Ledger

Petrol pump management web app — daily duty entry (meter readings, test fuel, stock transfers), tank stock, fuel purchases, credit customers & bowsers, bank accounts, expenses, salary sheets, monthly P&L, activity log and Owner/Manager/Staff logins.

It is a **static site** (plain HTML/CSS/JS, no build step) that stores everything in **Firebase Firestore**, so every device that opens the link sees the same live data.

```
index.html               page shell
css/styles.css           theme (light + dark)
js/app.js                the whole app
js/firebase-config.js    your Firebase project keys  ← the only file you must edit
firestore.rules          database access rules (paste into Firebase console)
firebase.json            Firebase Hosting settings — what to upload, cache headers
.firebaserc              which Firebase project to deploy to
.github/workflows/       auto-deploys on every push to main (GitHub Pages, and Firebase Hosting
                         once its secret is set — see below)
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

## 2b. Firebase Hosting (optional second home)

The same files can be served from Firebase Hosting, on the same project that already holds the
database. You end up with `https://conztant-fuel-ledger.web.app`. Both sites read the same
Firestore, so they show the same data; nothing has to be migrated.

Pick one of the two routes.

### Automatic, on every push — no software to install

1. Firebase console → **Project settings → Service accounts → Generate new private key**. A `.json`
   file downloads. It grants deploy rights to the project, so treat it as a password: never commit
   it, and delete it from Downloads once step 2 is done.
2. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**.
   Name `FIREBASE_SERVICE_ACCOUNT`, value = the whole contents of that `.json` file.
3. Push anything, or run **Actions → Deploy to Firebase Hosting → Run workflow**.

Until that secret exists the workflow finishes green without deploying, so it never reports a
failure for a step you have not set up yet.

### By hand from this PC

The CLI needs no Node install — the standalone Windows build is one self-contained `.exe`, about
250 MB, so the download takes a few minutes:

```powershell
Invoke-WebRequest https://github.com/firebase/firebase-tools/releases/latest/download/firebase-tools-win.exe -OutFile firebase.exe
.\firebase.exe login
.\firebase.exe deploy --only hosting
```

`login` opens a browser to sign in with the Google account that owns the Firebase project. Use
`firebase-tools-win.exe`, not the `-instant-` one beside it on the releases page: that variant opens
its own shell instead of running the command you give it.

`firebase.exe` is already in `.gitignore`. Drop `--only hosting` and it also publishes
`firestore.rules`, which is useful when you have edited them here, and a no-op when you have not.

### Then

Firebase console → **Authentication → Settings → Authorized domains** → add
`conztant-fuel-ledger.web.app`.

### A note on caching

`firebase.json` serves HTML, JS and CSS with `Cache-Control: no-cache`. There is no build step, so
`app.js` keeps the same name from one release to the next; without this a browser could sit on an
old copy for hours after a deploy. `no-cache` does not stop the browser caching — it only makes it
ask whether its copy is still current, so a push is picked up on the next load. Images and fonts
are cached for a week, since those do change name when they change.

If you later want Firebase Hosting to be the only home, delete
`.github/workflows/deploy.yml` and switch **Settings → Pages → Source** to *None*.

## 3. First run

Open the site. With no users yet it asks you to create the **Owner** account, then go to **Setup** and add tanks → nozzles → staff → today's rates. Add Managers/Staff under **Setup → Users**.

## Running locally

Open `index.html` directly in a browser, or serve the folder (e.g. VS Code "Live Server"). It talks to the same Firestore database as the live site. Add `localhost` to Firebase Authorized domains if anonymous sign-in is refused.

## Security notes

- The Firebase config values are project identifiers, not secrets; access is governed by `firestore.rules`.
- The rules let any client that loaded the app read/write — the in-app Owner/Manager/Staff passwords are a convenience lock, not encryption. Keep the site URL private and don't reuse important passwords.
- Firestore free tier: 50k reads / 20k writes per day — far more than a single station uses.
