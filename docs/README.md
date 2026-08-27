# Developer Setup Guide

This guide explains how a new developer can install, run, and understand the Cucumber report converter.

## Technology Stack

| Area | Technology |
| --- | --- |
| User interface | HTML5 |
| Styling | CSS3 |
| Application logic | Vanilla JavaScript |
| Development server | Vite |
| ZIP processing | JSZip |
| HTML-to-image rendering | html2canvas |
| PDF generation | jsPDF |
| Runtime | Modern web browser |
| Source control | Git and GitHub |

JSZip, html2canvas, and jsPDF are loaded from jsDelivr in `index.html`. They are not bundled into the repository's `node_modules` directory.

## Prerequisites

Install the following on the computer:

- Node.js 18 or newer
- npm, included with Node.js
- Git
- A modern browser such as Chrome, Edge, Firefox, or Safari

Check the installations:

```powershell
node --version
npm --version
git --version
```

## Get the Code

Clone the repository and enter the project directory:

```powershell
git clone https://github.com/Anshul-flooringos/cucumber-reporting-tool.git
cd cucumber-reporting-tool
```

The main development branch is currently:

```powershell
git switch feature/cucumber-report-export
```

## Install and Run

This project has no local runtime dependencies. Vite is invoked through `npx` by the existing npm script.

Start the development server:

```powershell
npm run dev
```

Vite prints the address in the terminal. Open the displayed URL, normally:

```text
http://127.0.0.1:5173/
```

If that port is busy, Vite automatically chooses another port, such as `5174`.

Keep the terminal running while using the app. Stop the server with `Ctrl+C`.

## First Use

1. Generate a complete Cucumber HTML report.
2. ZIP the complete report directory, including `index.html`, report pages, stylesheets, scripts, images, fonts, and icons.
3. Open Gherkin Press in the browser.
4. Drop the ZIP into the upload area.
5. Confirm the original report appears in the preview.
6. Use the report navigation and test-case links.
7. Export responsive HTML for interactive use or PDF for fixed-page sharing.

The ZIP must contain an `index.html` file. It may be at the ZIP root or inside nested folders.

## How the Code Works

1. `src/app.js` receives the selected ZIP file.
2. JSZip reads the archive in the browser.
3. The app locates the archive's `index.html`.
4. Every local asset is converted to an embedded data URL.
5. Relative references for CSS, images, fonts, SVG icons, and scripts are rewritten.
6. Linked report HTML pages are embedded and opened inside the responsive preview.
7. The HTML export stores all prepared report pages in one standalone file.
8. The PDF export renders each report page and splits it into A4 PDF pages.

The tool does not send the report to a backend and does not reconstruct the report from JSON. The original Cucumber HTML is preserved as the source of truth.

## Project Structure

```text
cucumber-pdf-tool/
├── index.html       # App shell and CDN library references
├── src/
│   ├── app.js       # ZIP processing, navigation, and exports
│   └── styles.css   # App shell styling
├── docs/
│   └── README.md    # This developer setup guide
├── package.json     # npm development script
├── README.md        # Product overview and basic usage
└── .gitignore       # Ignored local files
```

## Useful Development Commands

Start the app:

```powershell
npm run dev
```

Check JavaScript syntax:

```powershell
node --check src\app.js
```

Check the working tree:

```powershell
git status
```

View branches:

```powershell
git branch --all
```

## Troubleshooting

### `npm run dev` asks to install Vite

The project uses `npx vite`, so npm may ask permission to download Vite the first time. Enter `y` and let the installation finish.

### The page does not load

Use the exact URL printed by Vite. If `5173` is already in use, check whether Vite selected `5174` or another port.

### The ZIP is rejected

Confirm that the file ends in `.zip`, is smaller than 100 MB, and contains an `index.html` file.

### Icons or images are missing

Make sure the ZIP includes the report's asset folders, including fonts, images, SVG files, CSS files, and JavaScript files. The tool can only preserve assets that are present in the archive.

### The PDF is not responsive

PDF is a fixed-page format. Use **Export responsive HTML** when you need browser resizing, search, filters, and navigation.

## Contribution Workflow

Create a branch for a change:

```powershell
git switch -c feature/your-change
```

Run the syntax check, test the app in the browser, and review the diff:

```powershell
node --check src\app.js
git diff
```

Commit and push the branch:

```powershell
git add .
git commit -m "Describe your change"
git push -u origin feature/your-change
```

Open a pull request on GitHub when the change is ready for review.
