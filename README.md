# 🗺️ SnapMap: Interactive SVG Map Generator

SnapMap is a premium, client-side interactive map generator built on **React, D3.js, TopoJSON, and geoBoundaries APIs**. It gives developers, designers, and cartographers the power to generate, customize, and export highly precise vector maps down to local administrative levels.

Unlike standard map generators, SnapMap supports deep multi-level drill-downs: **Global (World) ➔ Country (ADM1 - States/Provinces) ➔ State (ADM2 - Districts/Counties/Departments)**.

---

## 📈 Repository & Page Analytics

To track community engagement, we utilize real-time visual counters directly in this README. 

| Metric | Badge | Description |
| :--- | :--- | :--- |
| **Total Documentation & Repo Views** | ![Repo Hits](https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fgithub.com%2FHelloPrincePal%2FSnapMap&count_bg=%23D4AF37&title_bg=%23181A1F&icon=github.svg&icon_color=%23E7E7E7&title=Repo+Views&edge_flat=false) | Increments every time a visitor views this GitHub repository. |
| **Live App Visitors & Map Sessions** | ![App Sessions](https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2FHelloPrincePal.github.io%2FSnapMap%2Fapp&count_bg=%2300C853&title_bg=%23181A1F&icon=googlemaps.svg&icon_color=%23E7E7E7&title=App+Visitors&edge_flat=false) | Tracks unique client sessions loaded on the hosted GitHub Pages site. |
| **Interactive Map Exports (Estimation)** | ![Map Exports Counter](https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2FHelloPrincePal.github.io%2FSnapMap%2Fexports&count_bg=%2300B0FF&title_bg=%23181A1F&icon=serverless.svg&icon_color=%23E7E7E7&title=Map+Exports&edge_flat=false) | Estimated download tracking (increments based on unique client export requests). |
---

## 🚀 Live Demo

Deploy and customize maps immediately:  
👉 **[Live Hosted Application](https://HelloPrincePal.github.io/SnapMap/)**

---

## ✨ Features

- **🌐 Projections & Coordinate Systems**: Toggle between **Equirectangular**, **Mercator**, **Orthographic (Globe)**, and **Albers Equal Area** projections on the fly.
- **🔍 Deep Hierarchical Drill-down**:
  - **Level 0 (World)**: View global datasets with responsive country bounds.
  - **Level 1 (Country/ADM1)**: View states, provinces, or regions (e.g. Bavaria in Germany, Karnataka in India).
  - **Level 2 (State/ADM2)**: View districts, departments, or counties (e.g. San Francisco County in California).
- **🗺️ Geopolitically Tailored Views**: Choose specific contested border variants (India, China, Russia, Morocco view) or filter by Continent/Region.
- **🖌️ Interactive Paint Bucket Tool**: Paint individual country or district polygons with custom color overrides by clicking directly on the canvas.
- **📐 Client-Side Boundary Simplification**: Dynamically reduce coordinate vertices using the **Douglas-Peucker** or **Visvalingam-Whyatt** algorithms, reducing exported SVG weights by up to 90% without breaking topographies.
- **🏷️ Adaptive Labels**: Toggle text labels with font styling, sizing, and **Adaptive Fitting** that adjusts text size dynamically to stay within polygon bounds (hides microscopic labels).
- **💾 High-Res Exports**: Export your cartographic creation to a clean, production-ready **SVG (vector)** or a **2x scaled PNG** for crisp high-dpi presentations.

---

## ⚙️ Technology Stack

- **Framework**: React 19 (Functional Hooks & States)
- **Bundler**: Vite 8 (Hot Module Replacement)
- **Map & Projections Engine**: D3.js (d3-geo, d3-zoom)
- **Vector Data Formats**: TopoJSON & GeoJSON (simplified client-side)
- **Boundaries Sources**: amCharts Geodata (World) & geoBoundaries API (Administrative Levels 1 & 2)

---

## 🛠️ Local Development Setup

To run the project locally on your machine, follow these simple steps:

### 1. Clone the repository
```bash
git clone https://github.com/princepal-kpmg/SnapMap.git
cd SnapMap
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run development server
```bash
npm run dev
```
Open **`http://localhost:5173/`** in your browser to view the application.

### 4. Build for production
```bash
npm run build
```
Compiled production-ready assets will be generated in the `dist/` folder.

---

## 📦 Deployment to GitHub Pages

This project is configured to build and deploy to GitHub Pages automatically via **GitHub Actions**.

1. Create a repository on GitHub named **`SnapMap`**.
2. Push your local files to GitHub (see the step-by-step instructions below).
3. On GitHub, navigate to **Settings** ➔ **Pages**.
4. Under **Build and deployment** ➔ **Source**, select **GitHub Actions**.
5. Once selected, the workflow defined in `.github/workflows/deploy.yml` will automatically build and publish the app to your custom URL.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE). Boundary datasets belong to their respective creators (geoBoundaries and amCharts).
