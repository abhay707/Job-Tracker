/* Job Capture — Runway. Extracts job info from the active tab,
   stores captures in chrome.storage.local, exports JSON/CSV. */

const $ = (id) => document.getElementById(id);

/* ── This function runs INSIDE the job page ── */
function extractJob() {
  const out = { title: "", company: "", url: location.href, host: location.hostname };

  // 1) JSON-LD JobPosting — most reliable, used by LinkedIn, Naukri, Indeed, most ATSs
  try {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const s of scripts) {
      let data;
      try { data = JSON.parse(s.textContent); } catch { continue; }
      const items = Array.isArray(data) ? data : (data["@graph"] || [data]);
      for (const item of items) {
        if (item && item["@type"] === "JobPosting") {
          out.title = out.title || item.title || "";
          const org = item.hiringOrganization;
          out.company = out.company || (typeof org === "string" ? org : (org && org.name) || "");
        }
      }
    }
  } catch (e) {}

  // 2) Site-specific selectors as fallback
  const pick = (sels) => {
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) return el.textContent.trim();
    }
    return "";
  };
  const h = location.hostname;
  if (!out.title || !out.company) {
    if (h.includes("linkedin")) {
      out.title = out.title || pick([
        ".job-details-jobs-unified-top-card__job-title h1",
        ".jobs-unified-top-card__job-title", "h1.top-card-layout__title", "h1"
      ]);
      out.company = out.company || pick([
        ".job-details-jobs-unified-top-card__company-name a",
        ".job-details-jobs-unified-top-card__company-name",
        ".jobs-unified-top-card__company-name", "a.topcard__org-name-link"
      ]);
    } else if (h.includes("naukri")) {
      out.title = out.title || pick(['h1[class*="jd-header-title"]', "h1"]);
      out.company = out.company || pick(['div[class*="jd-header-comp-name"] a', 'a[class*="comp-name"]']);
    } else if (h.includes("instahyre")) {
      out.title = out.title || pick([".job-title", "h1"]);
      out.company = out.company || pick([".company-name", ".employer-name"]);
    } else if (h.includes("wellfound") || h.includes("angel.co")) {
      out.title = out.title || pick(["h1"]);
      out.company = out.company || pick(['a[href^="/company/"] span', 'a[href^="/company/"]']);
    }
  }

  // 3) Generic meta fallbacks
  if (!out.title) {
    const og = document.querySelector('meta[property="og:title"]');
    let t = (og && og.content) || document.title || "";
    // "Frontend Engineer - Acme | LinkedIn" → keep first segment
    t = t.split("|")[0].split(" - ")[0].trim();
    out.title = t;
  }
  if (!out.company) {
    const site = document.querySelector('meta[property="og:site_name"]');
    if (site && site.content && !/linkedin|naukri|indeed|glassdoor|instahyre|cutshort|wellfound/i.test(site.content)) {
      out.company = site.content.trim();
    }
  }
  return out;
}

function sourceFromHost(host) {
  if (!host) return "Other";
  if (host.includes("linkedin")) return "LinkedIn";
  if (host.includes("naukri")) return "Naukri";
  if (host.includes("instahyre")) return "Instahyre";
  if (host.includes("cutshort")) return "Cutshort";
  if (host.includes("wellfound") || host.includes("angel.co")) return "Wellfound";
  return "Company careers page";
}

function guessRoleType(title) {
  const t = (title || "").toLowerCase();
  if (/full[\s-]?stack/.test(t)) return "Full-stack";
  if (/front[\s-]?end|react|ui engineer/.test(t)) return "Frontend";
  if (/back[\s-]?end|api|node|java|python developer/.test(t)) return "Backend";
  if (/sde|software engineer|software developer/.test(t)) return "SDE / Generalist";
  return "Other";
}

/* ── Storage helpers ── */
async function getJobs() {
  const { jobs = [] } = await chrome.storage.local.get("jobs");
  return jobs;
}
async function setJobs(jobs) {
  await chrome.storage.local.set({ jobs });
  renderCount(jobs);
}
function renderCount(jobs) {
  $("countBadge").textContent = `${jobs.length} saved`;
}

/* ── Capture view ── */
async function initCapture() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id || tab.url.startsWith("chrome://")) return;
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractJob,
    });
    const data = results && results[0] && results[0].result;
    if (data) {
      $("company").value = data.company || "";
      $("role").value = data.title || "";
      $("link").value = data.url || tab.url;
      $("source").value = sourceFromHost(data.host);
      $("roleType").value = guessRoleType(data.title);
    }
  } catch (e) {
    $("status").textContent = "Couldn't read this page — fill fields manually.";
    $("status").style.color = "var(--amber)";
  }
}

$("saveBtn").addEventListener("click", async () => {
  const company = $("company").value.trim();
  const role = $("role").value.trim();
  if (!company || !role) {
    $("status").textContent = "Company and role are required.";
    $("status").style.color = "var(--red)";
    return;
  }
  const jobs = await getJobs();
  const link = $("link").value.trim();
  if (link && jobs.some((j) => j.link === link)) {
    $("status").textContent = "Already saved this job.";
    $("status").style.color = "var(--amber)";
    return;
  }
  jobs.push({
    company,
    role,
    roleType: $("roleType").value,
    source: $("source").value,
    status: "Applied",
    dateApplied: new Date().toISOString().slice(0, 10),
    link,
    notes: "",
  });
  await setJobs(jobs);
  $("status").textContent = "Saved ✓";
  $("status").style.color = "var(--pine)";
});

/* ── Saved view ── */
async function renderSaved() {
  const jobs = await getJobs();
  const list = $("savedList");
  list.innerHTML = "";
  if (jobs.length === 0) {
    list.innerHTML = '<div class="empty">Nothing captured yet.<br>Open a job posting and hit Save.</div>';
    return;
  }
  jobs.slice().reverse().forEach((j, revIdx) => {
    const idx = jobs.length - 1 - revIdx;
    const div = document.createElement("div");
    div.className = "job";
    const del = document.createElement("button");
    del.className = "del";
    del.textContent = "×";
    del.title = "Remove";
    del.addEventListener("click", async () => {
      const cur = await getJobs();
      cur.splice(idx, 1);
      await setJobs(cur);
      renderSaved();
    });
    const b = document.createElement("b");
    b.textContent = j.company;
    const span = document.createElement("span");
    span.textContent = `${j.role} · ${j.source} · ${j.dateApplied}`;
    div.append(del, b, span);
    list.appendChild(div);
  });
}

$("copyJson").addEventListener("click", async () => {
  const jobs = await getJobs();
  await navigator.clipboard.writeText(JSON.stringify(jobs, null, 2));
  $("status2").textContent = `Copied ${jobs.length} job(s) — paste into the tracker's Import.`;
});

$("downloadCsv").addEventListener("click", async () => {
  const jobs = await getJobs();
  const esc = (v) => '"' + String(v || "").replace(/"/g, '""') + '"';
  const rows = [
    ["company", "role", "roleType", "source", "status", "dateApplied", "link"].join(","),
    ...jobs.map((j) => [j.company, j.role, j.roleType, j.source, j.status, j.dateApplied, j.link].map(esc).join(",")),
  ];
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "job-captures.csv";
  a.click();
});

$("clearAll").addEventListener("click", async () => {
  if (!confirm("Remove all captured jobs? (Export first if you haven't.)")) return;
  await setJobs([]);
  renderSaved();
});

/* ── Tabs ── */
$("tabCapture").addEventListener("click", () => {
  $("tabCapture").classList.add("active");
  $("tabSaved").classList.remove("active");
  $("captureView").style.display = "";
  $("savedView").style.display = "none";
});
$("tabSaved").addEventListener("click", () => {
  $("tabSaved").classList.add("active");
  $("tabCapture").classList.remove("active");
  $("captureView").style.display = "none";
  $("savedView").style.display = "";
  renderSaved();
});

/* ── init ── */
(async () => {
  renderCount(await getJobs());
  initCapture();
})();
