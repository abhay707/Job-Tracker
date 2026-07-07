# Job Search Runway

A high-fidelity, visual job-search logbook designed to monitor and sustain application momentum on a clear, target-driven trajectory.

Job Search Runway is a light, data-driven tracker built to organize, visualize, and sustain your job application pace. Built around the concept of a 12-week runway, it provides immediate feedback on whether you are hitting your weekly targets, flags stale applications, and imports data directly from a browser extension.

---

## Deployment

The live application is deployed and accessible at:
* **Live Demo:** [Job Search Runway](https://your-deployment-link.com)

*(Update the link above with your production URL once deployed)*

---

## Design System

* **The Runway Strip**: A signature 12-week bar chart at the top of the interface visualizing your weekly applications relative to your target.
* **Warm Paper Theme**: Styled using a refined ink green-black font on a cool light-gray paper background (`#EEF1EF`), with curated status indicators (pine for offers, violet for assessments, amber for interviews/follow-ups, and muted red for rejections).
* **Typography**: Built using Archivo for display headers and IBM Plex Mono for data points.

---

## Key Features

* **12-Week Sprint Visualization**: Track how many applications you log each week. A dynamic pace-indicator highlights whether you are on pace, mid-pace, or behind pace for the current week.
* **Adjustable Weekly Targets**: Interactively scale your target application count up or down directly from the runway header.
* **Stale Application Flags (⚑)**: Automatically flags applications that have been silent for more than 7 days, placing them at the top of your queue for immediate follow-up.
* **Status Pipeline**: Categorize applications across Saved, Applied, Assessment, Interview, Offer, and Rejected states.
* **Local-first Persistence**: Automatically persists all tracker data locally in your browser's local storage.

---

## Browser Extension Integration

Job Search Runway supports direct JSON data imports from a companion browser extension to automate data logging.

### How to Import:
1. Use the browser extension to auto-capture job listings from supported job boards.
2. In the extension interface, navigate to the **Saved** tab and select **Copy JSON for tracker**.
3. In the Job Search Runway app, click **Import** in the toolbar.
4. Paste the copied JSON payload and click **Import jobs**. The tracker will automatically skip duplicate jobs.

*(Add links to the extension repository or Chrome Web Store listing here)*

---

## Tech Stack

* **Frontend**: React 19 + Vite 8
* **Bundler & Development Server**: Vite (with Hot Module Replacement)
* **Styling**: Vanilla CSS (inline encapsulation)
* **Linter**: Oxlint (configured in `.oxlintrc.json`)

---

## Local Development

### Prerequisites

* Node.js (v18+)
* npm (v10+)

### Installation

Clone the repository and install the dependencies:

```bash
# Install package dependencies
npm install
```

### Running the App

To start the local development server:

```bash
npm run dev
```

The application will run locally at **`http://localhost:5173/`**.

### Building for Production

To create an optimized production build of the static assets:

```bash
npm run build
```

This compiles your application into the `dist/` directory, ready to be hosted on Netlify, Vercel, GitHub Pages, or any static hosting provider.
