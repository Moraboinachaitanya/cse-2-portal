# Make This Portal Public (Get a Shareable Link)

This project is a static website, so you can host it free on Netlify or GitHub Pages.

## Fastest Method (Netlify) - No Git Needed

1. Open https://app.netlify.com/drop
2. In your computer, open folder:
   - AI-DS Portal
3. Select all project files and folders, then compress as a ZIP named portal.zip
   - Include html, css, js, and all csv files
4. Drag and drop portal.zip on the Netlify page
5. Netlify will publish instantly and give a link like:
   - https://your-site-name.netlify.app

You can share that link with everyone.

## Better Long-Term Method (GitHub Pages)

Use this when you want easy updates and version control.

1. Create a new repository on GitHub (for example: ai-ds-portal)
2. In this project folder, run:

```powershell
git add .
git commit -m "Initial portal publish"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ai-ds-portal.git
git push -u origin main
```

3. In GitHub repository settings:
   - Go to Settings > Pages
   - Source: Deploy from a branch
   - Branch: main
   - Folder: /(root)
4. Save and wait 1-2 minutes
5. Your public link will be:
   - https://YOUR_USERNAME.github.io/ai-ds-portal/
   - Replace YOUR_USERNAME with your real GitHub username.
   - If the repo name is different, use that exact repo name in the URL.
   - If you see a 404 page, the site has not been published to that GitHub Pages URL yet.

## If The Public Link Still Shows The Old Name

- Re-upload or repush the updated files after changing [index.html](index.html).
- If you use GitHub Pages or Netlify, wait a minute for the new deploy to finish.
- Hard refresh the browser or open the link in an incognito window to avoid cached content.

## Important Notes

- Do not remove or rename CSV files unless you also update fetch paths in JS files.
- File names are case-sensitive on hosting services.
- After any update, republish (Netlify) or push to main (GitHub Pages).
