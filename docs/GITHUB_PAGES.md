# GitHub Pages Setup Guide

This guide will help you publish your Porter website using GitHub Pages.

## Quick Setup (5 minutes)

### 1. Enable GitHub Pages

1. Go to your GitHub repository: https://github.com/itamarco/porter
2. Click **Settings** (top right)
3. Click **Pages** in the left sidebar
4. Under **Source**, select:
   - **Deploy from a branch**
   - Branch: `main`
   - Folder: `/docs`
5. Click **Save**

Your site will be published at: **https://itamarco.github.io/porter**

It may take 1-2 minutes for the first deployment to complete.

## 2. Add Screenshots

To make your website look great, add screenshots of Porter in action:

### Taking Screenshots

1. **Main Dashboard**: Show the overall interface with clusters, namespaces, and services
2. **Service Browser**: Display the service list with port information
3. **Active Port Forwards**: Show the active forwards dashboard with status indicators

### Adding Screenshots

1. Take screenshots of Porter (⌘+Shift+4 on macOS, Win+Shift+S on Windows)
2. Save them as PNG files with descriptive names:
   ```
   docs/screenshots/dashboard.png
   docs/screenshots/service-browser.png
   docs/screenshots/active-forwards.png
   ```
3. Update `docs/index.html` to use your screenshots:

Replace the screenshot placeholder sections with:

```html
<div class="screenshot-card">
    <img src="screenshots/dashboard.png" alt="Porter Dashboard">
    <p class="screenshot-caption">Main Dashboard</p>
</div>
```

### Recommended Screenshot Sizes

- **Resolution**: 1600x1000 pixels (16:10 aspect ratio)
- **Format**: PNG for best quality
- **File size**: Compress to under 500KB each for faster loading

### Tools for Screenshots

- **macOS**: Built-in (⌘+Shift+4), or use [CleanShot X](https://cleanshot.com/)
- **Windows**: Built-in (Win+Shift+S), or use [ShareX](https://getsharex.com/)
- **Compression**: [TinyPNG](https://tinypng.com/) or [Squoosh](https://squoosh.app/)

## 3. Customize the Website (Optional)

### Update Colors

Edit `docs/styles.css` to change the color scheme:

```css
:root {
    --primary-color: #2563eb;  /* Main brand color */
    --primary-hover: #1d4ed8;  /* Hover state */
}
```

### Add Custom Content

- Edit `docs/index.html` to add more sections
- Add demo videos or GIFs
- Include user testimonials
- Add FAQ section

### Add Analytics (Optional)

To track visitors, add Google Analytics or other analytics:

1. Get your tracking ID
2. Add the tracking script before `</head>` in `index.html`

## 4. Update README

Add a link to your new website in `README.md`:

```markdown
## 🌐 Website

Visit our website: [https://itamarco.github.io/porter](https://itamarco.github.io/porter)
```

## 5. Custom Domain (Optional)

Want to use a custom domain like `porter.yourdomain.com`?

1. Add a file named `CNAME` to the `docs/` folder with your domain:
   ```
   porter.yourdomain.com
   ```
2. Configure your DNS provider to point to GitHub Pages:
   ```
   CNAME: yourusername.github.io
   ```
3. Wait for DNS propagation (can take up to 24 hours)

## Troubleshooting

### Site not loading?

- Check that GitHub Pages is enabled in Settings → Pages
- Make sure you selected the `/docs` folder
- Wait 1-2 minutes for GitHub to build and deploy
- Clear your browser cache

### Images not showing?

- Make sure image paths are correct (relative to `docs/`)
- Check that image files are committed to git
- Use lowercase filenames without spaces

### Changes not appearing?

- GitHub Pages can take 1-2 minutes to update
- Clear your browser cache (⌘+Shift+R on macOS, Ctrl+Shift+R on Windows)
- Check the Pages section in Settings to see build status

## Next Steps

1. ✅ Enable GitHub Pages
2. 📸 Add screenshots
3. 🎨 Customize colors and content
4. 🔗 Update README with website link
5. 📢 Share your new website!

## Need Help?

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Pages Troubleshooting](https://docs.github.com/en/pages/getting-started-with-github-pages/troubleshooting-jekyll-build-errors-for-github-pages-sites)
