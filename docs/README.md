# Porter Documentation

This directory contains the Porter website and documentation.

## Website

The `index.html` file is a complete landing page for the Porter project, designed to be hosted on GitHub Pages.

### Quick Preview

To preview the website locally:

**Option 1: Python (Quick)**
```bash
cd docs
python3 -m http.server 8000
```
Then open: http://localhost:8000

**Option 2: Node.js**
```bash
npx serve docs
```

**Option 3: VS Code**
- Install "Live Server" extension
- Right-click `index.html` → "Open with Live Server"

### Structure

```
docs/
├── index.html          # Main landing page
├── styles.css          # Website styling
├── screenshots/        # Add your app screenshots here
├── GITHUB_PAGES.md    # Guide for publishing to GitHub Pages
└── *.md               # Other documentation files
```

### Publishing to GitHub Pages

See [GITHUB_PAGES.md](GITHUB_PAGES.md) for complete setup instructions.

**Quick steps:**
1. Go to GitHub repository Settings → Pages
2. Select "Deploy from a branch" → `main` → `/docs`
3. Save and wait 1-2 minutes
4. Your site will be live at: `https://yourusername.github.io/porter`

## Adding Screenshots

1. Take screenshots of Porter (recommended size: 1600x1000px)
2. Save them in `screenshots/` directory:
   - `dashboard.png` - Main dashboard
   - `service-browser.png` - Service browser view
   - `active-forwards.png` - Active forwards panel
3. Update `index.html` to reference your screenshots (replace placeholder divs)

Example:
```html
<div class="screenshot-card">
    <img src="screenshots/dashboard.png" alt="Porter Dashboard" style="width: 100%;">
    <p class="screenshot-caption">Main Dashboard</p>
</div>
```

## Documentation Files

- `PUBLISHING.md` - Guide for building and releasing Porter
- `TESTING.md` - Testing instructions
- `WINDOWS_PORT_FORWARD_FIX.md` - Windows-specific troubleshooting
- `GITHUB_PAGES.md` - Website deployment guide

## Customization

### Colors

Edit `styles.css` to change the color scheme:

```css
:root {
    --primary-color: #2563eb;
    --primary-hover: #1d4ed8;
    /* ... more colors ... */
}
```

### Content

Edit `index.html` to:
- Update feature descriptions
- Add new sections
- Modify installation instructions
- Change text and headings

## Need Help?

- [GitHub Pages Docs](https://docs.github.com/en/pages)
- [Markdown Guide](https://www.markdownguide.org/)
