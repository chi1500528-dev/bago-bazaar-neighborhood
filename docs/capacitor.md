# Bago Market — Android & iOS apps (Capacitor)

The apps are a native shell that opens the live site
`https://bago-bazaar-neighborhood.lovable.app`. Every website update appears in
the apps immediately — no store update needed. The no-VPN relay keeps working.

**Publish the website first**, the apps show whatever is published.

## Android APK without installing anything
1. GitHub repo → **Actions** → **Build Android APK** → **Run workflow**.
2. When it finishes, open the run → download **bago-market-debug-apk**.
3. Copy the `.apk` to an Android phone and open it (allow "install unknown apps").

## Android (Android Studio, for Play Store)
```bash
npm install
npx cap add android
npx cap sync android
npx cap open android   # Build → Generate Signed Bundle (AAB) for Play Store
```

## iOS (needs a Mac with Xcode, Apple Developer account $99/yr)
```bash
npm install
npx cap add ios
npx cap sync ios
npx cap open ios       # set Team, then Product → Archive → upload
```

## Changing the site address
Edit `server.url` in `capacitor.config.ts` (e.g. your Netlify or custom domain), then `npx cap sync`.

## Icons & splash
`npm i -D @capacitor/assets`, put a 1024px `assets/icon.png`, run `npx capacitor-assets generate`.
