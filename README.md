# Gherkin Press

Gherkin Press converts a complete Cucumber HTML report ZIP into a browser-viewable report while preserving the report's original HTML, CSS, JavaScript, images, fonts, icons, and navigation.

The tool runs locally in the browser. The ZIP is processed client-side and is not uploaded to a server.

## What It Does

1. Accepts a Cucumber report ZIP by drag and drop or file selection.
2. Finds the report's `index.html` file inside the archive.
3. Reads all files from the ZIP and embeds local assets as data URLs.
4. Rewrites relative asset references so stylesheets, images, fonts, SVG icons, and other resources continue to work.
5. Displays the original report layout inside the preview.
6. Keeps links between report HTML pages working inside the preview.
7. Exports a responsive, self-contained HTML report.
8. Exports the rendered report as a multipage PDF.

The report's own `index.html` is used as the source of truth. The application does not rebuild the report from Cucumber JSON, so the original report format is retained.

## Requirements

- Node.js 18 or newer
- npm
- A modern browser such as Chrome, Edge, Firefox, or Safari
- A Cucumber HTML report ZIP containing an `index.html` file

## Run Locally

Open PowerShell in the project directory:

```powershell
cd C:\cucumber-pdf-tool
npm run dev
```

Vite will print a local URL, usually:

```text
http://127.0.0.1:5173/
```

If port `5173` is already in use, Vite automatically selects another port, such as `5174`.

Open the displayed URL in your browser.

## Use the Tool

1. Create a ZIP from the complete generated Cucumber HTML report directory.
2. Open Gherkin Press in your browser.
3. Drop the ZIP into the upload area, or select it with **browse files**.
4. Wait for the original report to appear in the preview.
5. Use the report's navigation, filters, search controls, and test links inside the preview.
6. Choose **Export responsive HTML** when you need a standalone, responsive, navigable report.
7. Choose **Export original report PDF** when you need a fixed-page document for printing or sharing.

## ZIP Structure

The ZIP should contain the generated report and its related assets. For example:

```text
report.zip
└── reports/
    └── html/
        ├── index.html
        ├── features/
        │   ├── feature-one.html
        │   └── feature-two.html
        ├── css/
        ├── js/
        ├── images/
        └── fonts/
```

The `index.html` file may be at the ZIP root or inside a nested directory. Local HTML pages and assets are supported.

## Responsive HTML Export

The responsive HTML export is the best format for interactive use. It packages the report pages and assets into one HTML file that can be opened independently after download. Navigation between embedded report pages continues to work without the original ZIP directory.

The exported file is named similar to:

```text
reports (3)-responsive.html
```

## PDF Export

PDF is a fixed-page format and cannot reflow responsively like HTML. The PDF export renders the report pages and places them across multiple A4 pages. Use the responsive HTML export when you need resizing, search, filtering, or clickable navigation.

## Libraries

The browser loads these libraries from jsDelivr at runtime:

- [JSZip](https://stuk.github.io/jszip/) for reading ZIP archives
- [html2canvas](https://html2canvas.hertzen.com/) for rendering report pages
- [jsPDF](https://github.com/parallax/jsPDF) for creating PDF files
- [Vite](https://vite.dev/) for the local development server

An internet connection is needed when the app first loads these CDN libraries. The report ZIP itself is processed locally.

## Project Structure

```text
cucumber-pdf-tool/
├── index.html       # Application entry page and CDN library references
├── src/
│   ├── app.js       # ZIP loading, asset embedding, navigation, and exports
│   └── styles.css   # Gherkin Press application styling
├── package.json     # Local development script
├── README.md        # Setup and usage documentation
└── .gitignore       # Local dependency and environment exclusions
```

## Limitations

- The ZIP must contain an `index.html` file.
- The browser must be able to load the CDN libraries used by the app.
- PDF pages are fixed and are not responsive.
- Very large reports may require more browser memory during HTML rendering and PDF generation.
- Browser security restrictions may affect third-party resources that are not included in the ZIP.

## License

No license has been specified for this project yet.
