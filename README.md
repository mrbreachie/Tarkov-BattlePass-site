# Escape from Tarkov BattlePass Tracker

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Static Site](https://img.shields.io/badge/type-static%20site-green)
![No Dependencies](https://img.shields.io/badge/dependencies-none-brightgreen)

An interactive web-based battlepass progression tracker for **Escape from Tarkov**. Displays 12 pages of rewards with detailed item information, document requirements, cumulative progression tracking, and custom page range analysis.

## ✨ Features

- **12-Page BattlePass** - Browse through all reward pages with smooth navigation
- **Item Management** - View detailed item information including document requirements
- **Progression Tracking** - View cumulative document requirements up to any page
- **Custom Page Range Filter** - Analyze document requirements for specific page ranges
- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Dark Theme** - Tarkov-inspired dark interface with customizable CSS variables
- **Zero Dependencies** - Pure HTML, CSS, and JavaScript—no build tools required
- **Collaborative-Friendly** - Individual JSON files per page support git workflows without merge conflicts
- **Session Persistence** - Remembers your progress between sessions using browser storage

## 🚀 Quick Start

### Online (Fastest Way)
1. Simply open `index.html` in your web browser
2. Navigate between pages using buttons or progress bar
3. Click items to view detailed requirements
4. Use the range filter to compare document requirements

### Local Development
```bash
# Clone the repository
git clone https://github.com/yourusername/tarkov-battlepass-tracker.git
cd tarkov-battlepass-tracker

# Option 1: Python 3
python -m http.server 8000

# Option 2: Node.js
npx http-server

# Option 3: PHP
php -S localhost:8000
```

Then visit `http://localhost:8000` in your browser.

**No build, no install, no configuration needed!**

## 📁 Project Structure

```
tarkov-battlepass-tracker/
├── index.html                      # Main HTML entry point
├── app.js                          # Core application logic
├── style.css                       # Responsive styling & theme
├── LICENSE                         # MIT License
├── README.md                       # This file
├── data/
│   ├── battlepass-index.json      # Metadata & page listing
│   ├── documents.json             # All document definitions
│   └── pages/
│       ├── page1.json
│       ├── page2.json
│       ├── ... (pages 3-12)
│       └── page12.json
└── images/
    ├── documents/                 # Document reference images
    └── items/                     # Item/reward images
```

## 🎮 How to Use

### Navigation
- **Next/Previous Buttons** - Navigate one page at a time
- **Progress Bar** - Click any segment to jump to that page
- **Keyboard Arrows** - Use ← and → keys for navigation
- **Auto-Save** - Your current page is automatically saved

### Page Range Selector
Located at the top of the page, allows you to filter document requirements:
1. Set **From Page** and **To Page** to your desired range
2. Click **Update** to recalculate requirements
3. Click **Reset** to return to default view
4. Your range selection is preserved when navigating between pages

### Viewing Requirements
- **Item Requirements** - Click any item to see its document needs
- **Page Requirements** - Displays minimum and total documents for the current page
- **Cumulative Requirements** - Shows total documents needed from page 1 to current page

## 📊 Data Structure

### Document (documents.json)

```json
{
    "id": "doc_unique_id",
    "Document name": "Full Display Name",
    "shortName": "Short Name",
    "image": "./images/documents/doc_image.png"
}
```

### Page Data (pages/pageN.json)

```json
{
    "pageNumber": 1,
    "prerequisites": {
        "itemsRequired": 0
    },
    "items": [
        {
            "itemName": "Item Name",
            "itemId": "tarkov_item_id",
            "image": "./images/items/item_image.png",
            "requirements": [
                {
                    "documentName": "Full Document Name",
                    "amount": 2
                }
            ]
        }
    ]
}
```

**Field Descriptions:**
- **pageNumber** - Page number (1-12)
- **prerequisites.itemsRequired** - Number of items to complete to unlock next page (0 = no requirement)
- **itemName** - Display name of the reward
- **itemId** - Unique identifier (Tarkov item ID format)
- **image** - Path to item image
- **documentName** - Must match a document name from documents.json exactly
- **amount** - Quantity of document required

### BattlePass Index (battlepass-index.json)

```json
{
    "name": "Escape from Tarkov BattlePass",
    "totalPages": 12,
    "pageFiles": ["page1.json", "page2.json", ..., "page12.json"]
}
```

## 🎨 Customization

### Theme Colors

Edit CSS variables in `style.css` to customize the appearance:

```css
:root {
    --background: #101515;      /* Main background color */
    --panel: #172222;           /* Panel/card backgrounds */
    --panel-light: #223030;     /* Lighter panel variant */
    --border: #39504d;          /* Border colors */
    --text: #e4e8df;            /* Primary text color */
    --muted: #92a39e;           /* Secondary/muted text */
    --accent: #c5a64b;          /* Primary accent color */
    --accent-light: #e3d39b;    /* Light accent color */
}
```

### Adding New Pages

1. Create `data/pages/pageN.json` following the page data structure
2. Update `data/battlepass-index.json` to include the new page in `pageFiles`
3. Add item images to `images/items/`
4. Refresh the browser

### Adding New Items

Edit the appropriate page file and add to the `items` array:

```json
{
    "itemName": "New Item Name",
    "itemId": "unique-item-id",
    "image": "./images/items/item-image.png",
    "requirements": [
        {
            "documentName": "Document Name",
            "amount": 1
        }
    ]
}
```

## 📜 License & Attribution

### Project License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

You are free to use, modify, and distribute this project, provided you include the license notice.

### Important: Third-Party Assets Attribution

**This tool uses images and data from Escape from Tarkov and community resources:**

- **Image Sources:**
  - [Tarkov Wiki (Fandom)](https://escapefromtarkov.fandom.com/wiki/Escape_from_Tarkov_Wiki)
  - [tarkov.dev](https://tarkov.dev/) - Community Database
  - Escape from Tarkov Game Files

- **Asset Ownership:**
  - © **Battlestate Games Limited** - All game assets, images, and content remain the exclusive property of Battlestate Games Limited
  - This tool is unofficial and not endorsed by Battlestate Games Limited
  - Images are used for informational and reference purposes

### What You Can Do

✅ **Permitted:**
- Use this tracker for personal, educational, or community purposes
- Modify the code and data
- Share the tracker with the Tarkov community
- Contribute improvements back to this project
- Host your own version of this tracker

### What You Should Know

⚠️ **Important:**
- The game assets (images, item data, document data) are owned by Battlestate Games Limited
- This is an **unofficial** community tool
- Respect Battlestate Games' intellectual property
- Include proper attribution when sharing
- Be aware this tool may require updates as the game changes

### Respecting Copyright

When using or sharing this project:

1. **Keep Attributions** - Link to original sources (Tarkov Wiki, tarkov.dev)
2. **Acknowledge Battlestate Games** - Give credit where due
3. **Use Appropriately** - Use for community benefit, not commercial purposes
4. **Follow Terms of Service** - Comply with Battlestate Games' Terms of Service

### Battlestate Games Terms

This project operates under respect for Battlestate Games Limited's intellectual property. If Battlestate Games requests changes or removal, they should be honored promptly. For questions about usage rights, contact Battlestate Games directly.

## 🔧 Technologies Used

- **HTML5** - Semantic markup and structure
- **CSS3** - Responsive design with CSS variables
- **Vanilla JavaScript** - No frameworks or dependencies
- **JSON** - Structured data storage

**No external dependencies** - This runs completely in the browser with zero package managers or build tools required.

## 📋 Contributing

Contributions are welcome! Please help make this tool better for the Tarkov community.

### How to Contribute

1. **Fork** the repository on GitHub
2. **Create a branch** for your feature (`git checkout -b feature/your-feature`)
3. **Make your changes** (update data, styling, or functionality)
4. **Test** in multiple browsers to ensure compatibility
5. **Commit** with clear messages (`git commit -m 'Add feature description'`)
6. **Push** to your fork (`git push origin feature/your-feature`)
7. **Open a Pull Request** with description of changes

### Contribution Guidelines

- Keep JSON data clean and well-formatted
- Use consistent naming conventions
- Test changes in multiple browsers (Chrome, Firefox, Safari, Edge)
- Update documentation if adding features
- Optimize images before uploading
- Respect the project's MIT license and attribution requirements

### Ideas for Contribution

- Add more detailed tooltips or help text
- Improve mobile responsiveness
- Add export functionality (CSV, JSON)
- Implement search/filter features
- Add document location information
- Create additional analysis views

## 🐛 Issues & Support

Found a bug or have a feature request? [Open an issue](https://github.com/yourusername/tarkov-battlepass-tracker/issues) on GitHub!

### Troubleshooting

**Images not loading?**
- Check that image paths in JSON match actual file locations
- Verify images exist in `images/documents/` and `images/items/`
- Check browser console (F12) for error messages

**Data not updating?**
- Clear browser cache (Ctrl+Shift+Del or Cmd+Shift+Delete)
- Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)
- Check browser console for JSON parsing errors

**Styling looks wrong?**
- Try a different browser
- Clear CSS cache with hard refresh
- Check that style.css is in the root directory

## 📚 Resources & Links

- [Escape from Tarkov Official](https://www.escapefromtarkov.com/)
- [Tarkov Wiki](https://escapefromtarkov.fandom.com/) - Community information
- [tarkov.dev](https://tarkov.dev/) - Community database
- [Battlestate Games](https://www.battlestategames.com/) - Official publisher

## 🤝 Community

This is a community-created tool for the Escape from Tarkov community. Share feedback, ideas, and improvements!

- Report bugs on [GitHub Issues](https://github.com/yourusername/tarkov-battlepass-tracker/issues)
- Suggest features via pull requests
- Help translate or localize the interface
- Share with your friends and communities

## 💡 Development Notes

### Architecture

The app uses a simple client-side JavaScript architecture:
- HTML/CSS for structure and styling
- Vanilla JS for interactivity (no jQuery, React, Vue, etc.)
- JSON files for data storage
- Browser's sessionStorage for persistence

### Performance

- Lazy loads page data as needed
- Caches rendered pages in memory
- Minimal DOM manipulation
- Optimized for fast rendering

### Browser Support

- Chrome/Chromium 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- Any modern browser supporting ES6 JavaScript

## 📝 Version History

### v1.0.0 (Current)
- Initial release
- 12-page battlepass tracker
- Document requirement tracking
- Custom page range filtering
- Responsive design
- Session persistence

## ❤️ Special Thanks

- Tarkov Wiki contributors for documentation
- tarkov.dev team for the community database
- Battlestate Games for creating Escape from Tarkov
- Community members for feedback and support

---

**Made with ❤️ for the Escape from Tarkov Community**

Have questions? Found a bug? Want to contribute? Open an issue on GitHub!
