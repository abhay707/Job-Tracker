# Job Capture — Runway (Chrome Extension)

Captures job postings in one click and exports them as JSON for your Job Search Runway tracker.

## Install (2 minutes)

1. Unzip this folder anywhere (e.g. `Documents/job-capture-extension`).
2. Open Chrome → go to `chrome://extensions`.
3. Turn on **Developer mode** (toggle, top-right).
4. Click **Load unpacked** → select the unzipped folder.
5. Pin the extension (puzzle-piece icon → pin "Job Capture - Runway").

## Daily use

1. Open any job posting (LinkedIn, Naukri, Instahyre, Cutshort, Wellfound, or a company careers page).
2. Click the extension icon — company, role, source, and link auto-fill. Fix anything that looks off.
3. Hit **Save this job**.
4. At the end of the day/week: open the **Saved** tab → **Copy JSON for tracker** → open your Runway tracker in Claude → click **Import** → paste → done. Duplicates (same link) are skipped automatically.

## How extraction works

The extension first reads the page's structured `JobPosting` data (JSON-LD), which most major job sites publish. If that's missing it falls back to site-specific selectors, then to page meta tags. Everything is stored locally in your browser — nothing is sent anywhere.
