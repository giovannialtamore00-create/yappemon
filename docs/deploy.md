# Deploy

CI: `.github/workflows/deploy.yml` (tests + build on every push to `main`, publishes to GitHub Pages). Vite `base: './'`. See [decisions.md](decisions.md) #43.

The microphone only works on **HTTPS** pages (or localhost), so put the game on a free HTTPS host. Pick **one** of these.

## Option A: GitHub Pages with one script (Windows, recommended)

This repository already contains a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds and publishes the game every time you push.

1. Make a free account at [github.com](https://github.com/) if you don't have one.
2. Open **PowerShell** in the project folder (in File Explorer: click the address bar, type `powershell`, press Enter).
3. Run:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\publish.ps1
   ```
   The script:
   - installs the GitHub CLI if needed (click **Yes** on the Windows admin prompt),
   - logs you in (a browser page opens; paste the code it shows),
   - creates a **public** repo called `yappemon`, turns on GitHub Pages and pushes the code,
   - waits for the deploy and prints your game's address: **`https://<your-username>.github.io/yappemon/`**

   To use another repo name: `... -File scripts\publish.ps1 -Repo my-game`.

After that, every `git push` redeploys automatically.

## Option B: GitHub Pages by hand

1. On github.com click **New repository**, name it (for example `yappemon`), choose **Public** and leave it empty (no README).
2. In the project folder run (replace `<you>`):
   ```bash
   git remote add origin https://github.com/<you>/yappemon.git
   git push -u origin main
   ```
3. On GitHub open the repo, then **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Open the **Actions** tab. When "Deploy to GitHub Pages" turns green, the game is at `https://<you>.github.io/yappemon/`. If the first run failed because Pages wasn't on yet, click it and choose **Re-run all jobs**.

## Option C: Netlify drag-and-drop (no Git needed)

1. Run `npm install` then `npm run build`.
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop) and drag the **`dist`** folder onto the page.
3. Netlify gives you an `https://….netlify.app` address. Share it.

