# FoxLab Map System - App

This directory contains the source code for the **Systemic Impact Analysis Tool**, built with **Astro**, **Vue 3**, and **Tailwind CSS**.

**🚀 Live Demo:** [https://foxlab-mapsystem.netlify.app/](https://foxlab-mapsystem.netlify.app/) (Demo Mode)

## 📁 Project Structure

- **`src/`**: Contains the application source code.
  - **`components/`**: Vue components.
  - **`layouts/`**: Astro layouts.
  - **`pages/`**: Astro pages (routes).
- **`public/`**: Static assets.
- **`astro.config.mjs`**: Astro configuration.
- **`netlify.toml`**: Netlify deployment configuration.

## 🛠️ Development

### Prerequisites

- Node.js (v18.14.1 or higher)
- npm

### Setup

1.  Navigate to this directory:
    ```bash
    cd app
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```
    The app will be available at `http://localhost:4321`.

### Build

To build the application for production:

```bash
npm run build
```

This will generate the static files in the `dist/` directory.

## 🚀 Deployment

The app is configured for deployment on Netlify. See the root `README.md` or `netlify.toml` for more details.
