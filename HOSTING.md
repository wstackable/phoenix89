# Hosting Phoenix 89 Web Edition

## Quick Start (Test Locally)

Open a terminal in this folder and run:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser. That's it.

---

## Option 1: GitHub Pages (Free, Recommended)

This is the easiest way to host and update in real time. Every push goes live automatically.

### Setup (one time)

1. Create a GitHub account at github.com if you don't have one
2. Install GitHub Desktop (desktop.github.com) or use the command line
3. Create a new repository called `phoenix89` (public)
4. Push all the files in this folder to the repository:

```bash
cd "Web Phoenix 89"
git init
git add .
git commit -m "Initial web port of Phoenix 89"
git remote add origin https://github.com/YOUR_USERNAME/phoenix89.git
git push -u origin main
```

5. Go to your repo on GitHub → Settings → Pages
6. Under "Source", select **main** branch, root folder
7. Click Save
8. Your game will be live at: `https://YOUR_USERNAME.github.io/phoenix89/`

### Updating (push changes live)

Every time you make a change:

```bash
git add .
git commit -m "Description of change"
git push
```

Changes go live in about 30-60 seconds. Anyone playing the game gets the new version on their next page refresh.

---

## Option 2: Netlify (Free, Even Easier)

1. Go to netlify.com and sign up (free)
2. Drag and drop this entire folder onto the Netlify dashboard
3. Your game is instantly live at a random URL like `amazing-game-123.netlify.app`
4. You can set a custom name like `phoenix89.netlify.app`

### Updating with Netlify

- **Manual**: Drag and drop the folder again
- **Automatic**: Connect to a GitHub repo (same as above) and every push auto-deploys

---

## Option 3: Vercel (Free)

1. Go to vercel.com and sign up
2. Install Vercel CLI: `npm install -g vercel`
3. Run `vercel` in this folder
4. Follow the prompts — your game is live

### Updating

```bash
vercel --prod
```

---

## Option 4: Your Own Server

If you have a web server (Apache, Nginx, etc.), just copy all the files to the web root:

```bash
scp -r "Web Phoenix 89/"* user@yourserver.com:/var/www/html/phoenix89/
```

The game is purely static files — no backend needed.

---

## Sharing With Family

Once hosted, share the URL with your family. The game works on:
- Desktop browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (touch controls not yet implemented — keyboard only for now)
- Tablets with a Bluetooth keyboard

### Recommended Workflow

1. Use **GitHub Pages** (free, auto-deploys)
2. Edit files locally in any text editor (VS Code recommended)
3. `git add . && git commit -m "change" && git push` to go live
4. Family always plays the latest version

---

## File Structure

```
index.html      - Main page (loads everything)
constants.js    - Game settings and configuration
sprites.js      - All pixel art sprite data and rendering
sound.js        - Procedural sound effects (Web Audio API)
player.js       - Player ship, movement, special abilities
weapons.js      - Bullets, firing, collision detection
enemies.js      - All 35+ enemy types and AI behaviors
levels.js       - Level definitions, wave sequences, themes
ui.js           - HUD, shop, menus, high scores
game.js         - Main game loop and state machine
```

To make a change, edit the relevant `.js` file, push, and it's live.
