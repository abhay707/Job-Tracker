# ✈️ Job Search Runway

> A high-fidelity, visual job-search logbook designed to keep your recruiting sprint on a clear, target-driven trajectory.

`Job Search Runway` is a clean, data-driven tracker built to organize, visualize, and sustain your job application pace. Built around the concept of a **12-week mission runway**, it provides instant feedback on whether you are hitting your weekly targets, flags applications that need follow-ups, and integrates with the Job Capture browser extension.

---

## 🎨 Design Concept & Aesthetics

* **The Runway Strip**: A signature 12-week bar chart at the top of the interface visualizing your weekly applications relative to your target.
* **Warm Paper Theme**: Styled using a refined ink green-black font on a cool light-gray paper background (`#EEF1EF`), with curated indicator accents (pine for offers, violet for assessments, amber for interviews/follow-ups, and muted red for rejections).
* **Premium Typography**: Built using *Archivo* for modern, bold display headers combined with *IBM Plex Mono* for tabular and data points.

---

## 🚀 Key Features

* **12-Week Sprint Visualization**: Easily track how many applications you log each week. A dynamic pace-indicator tells you if you are **on pace**, **mid-pace**, or **behind pace** for the current week.
* **Adjustable Weekly Targets**: Interactively scale your target application count up or down directly from the runway header.
* **Follow-up Flags ($\color{#B7791F}{\text{⚑}}$)**: Automatically flags applications that have been silent for more than 7 days, placing them at the top of your list for action.
* **Status Pipeline**: Categorize applications across *Saved*, *Applied*, *Assessment*, *Interview*, *Offer*, and *Rejected* states.
* **Seamless JSON Import**: Quick-import job details copied from the **Job Capture** extension.
* **Local-first Persistence**: Auto-saves your entire dashboard to browser local storage via a built-in fallback shim.

---

## 🛠️ Tech Stack

* **Frontend Framework**: [React 19](https://react.dev/) + [Vite 8](https://vite.dev/)
* **Bundler & Dev Server**: Vite (with Hot Module Replacement)
* **Styling**: Vanilla CSS (encapsulated inline style block)
* **Linter**: Oxlint (configured in `.oxlintrc.json`)

---

## 💻 Getting Started

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) (v18+) and npm installed.

### Installation

Clone this repository and install the dependencies:

```bash
# Navigate to the project directory
cd "Job Tracker"

# Install package dependencies
npm install
```

### Running Locally

To spin up the local development server:

```bash
npm run dev
```

The server will start, typically at **`http://localhost:5173/`**. Any changes you make to [JobTracker.jsx](file:///Users/mymac/Documents/Github/Job%20Tracker/src/JobTracker.jsx) will live-reload instantly in the browser.

### Building for Production

To create an optimized production build of the static assets:

```bash
npm run build
```

This compiles your application into the `dist/` directory, ready to be hosted on Netlify, Vercel, GitHub Pages, or any static hosting provider.
