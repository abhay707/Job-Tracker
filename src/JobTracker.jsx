import { useState, useEffect, useMemo } from "react";

/* ── Design tokens ─────────────────────────────────────────
   Concept: a job-search logbook / mission runway.
   Palette: ink green-black on cool paper, pine accent,
   amber for follow-ups, muted red for rejections.
   Type: Archivo (display) + IBM Plex Mono (data).
   Signature: the 12-week Runway strip at the top.
─────────────────────────────────────────────────────────── */

const C = {
  paper: "#EEF1EF",
  card: "#FFFFFF",
  ink: "#14231D",
  inkSoft: "#4A5B53",
  line: "#D8DFDA",
  pine: "#1F6F54",
  pineSoft: "#E3EFE9",
  amber: "#B7791F",
  amberSoft: "#F7ECD9",
  red: "#A63A3A",
  redSoft: "#F5E4E4",
  blue: "#2B6CB0",
  blueSoft: "#E2ECF6",
  violet: "#6B46C1",
  violetSoft: "#ECE6F7",
  grey: "#6B7280",
  greySoft: "#EBEDEF",
};

const STATUSES = [
  { key: "Saved", color: C.grey, soft: C.greySoft },
  { key: "Applied", color: C.blue, soft: C.blueSoft },
  { key: "Assessment", color: C.violet, soft: C.violetSoft },
  { key: "Interview", color: C.amber, soft: C.amberSoft },
  { key: "Offer", color: C.pine, soft: C.pineSoft },
  { key: "Rejected", color: C.red, soft: C.redSoft },
];
const statusMeta = (k) => STATUSES.find((s) => s.key === k) || STATUSES[0];

const ROLE_TYPES = ["Full-stack", "Backend", "Frontend", "SDE / Generalist", "Other"];
const SOURCES = ["LinkedIn", "Naukri", "Referral", "Instahyre", "Cutshort", "Wellfound", "Company careers page", "Campus / TnP", "Other"];

const STORAGE_KEY = "job-tracker-v1";
const TOTAL_WEEKS = 12;

const todayISO = () => new Date().toISOString().slice(0, 10);

function mondayOf(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  return Math.floor((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
}

function weekIndexOf(dateStr, startMonday) {
  return Math.floor(daysBetween(startMonday, dateStr) / 7);
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const emptyForm = () => ({
  company: "",
  role: "",
  roleType: "Full-stack",
  source: "LinkedIn",
  status: "Applied",
  dateApplied: todayISO(),
  link: "",
  notes: "",
});

export default function JobTracker() {
  const [data, setData] = useState(null); // {settings, apps}
  const [loadError, setLoadError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState(null);

  /* ── load ── */
  useEffect(() => {
    (async () => {
      let loaded = null;
      try {
        const res = await window.storage.get(STORAGE_KEY);
        if (res && res.value) loaded = JSON.parse(res.value);
      } catch (e) {
        // key doesn't exist yet — first run
      }
      if (!loaded) {
        loaded = {
          settings: { startMonday: mondayOf(todayISO()), weeklyTarget: 12 },
          apps: [],
        };
      }
      setData(loaded);
    })().catch(() => setLoadError(true));
  }, []);

  /* ── save ── */
  const persist = async (next) => {
    setData(next);
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.error("Save failed", e);
    }
  };

  const apps = data ? data.apps : [];
  const settings = data ? data.settings : { startMonday: mondayOf(todayISO()), weeklyTarget: 12 };

  /* ── derived ── */
  const currentWeek = Math.min(Math.max(weekIndexOf(todayISO(), settings.startMonday), 0), TOTAL_WEEKS - 1);

  const weekCounts = useMemo(() => {
    const counts = Array(TOTAL_WEEKS).fill(0);
    apps.forEach((a) => {
      if (a.status === "Saved") return;
      const w = weekIndexOf(a.dateApplied, settings.startMonday);
      if (w >= 0 && w < TOTAL_WEEKS) counts[w]++;
    });
    return counts;
  }, [apps, settings.startMonday]);

  const stats = useMemo(() => {
    const applied = apps.filter((a) => a.status !== "Saved");
    const heard = apps.filter((a) => ["Assessment", "Interview", "Offer"].includes(a.status));
    const interviews = apps.filter((a) => ["Interview", "Offer"].includes(a.status));
    const offers = apps.filter((a) => a.status === "Offer");
    const followUps = apps.filter(needsFollowUp);
    return {
      applied: applied.length,
      heardPct: applied.length ? Math.round((heard.length / applied.length) * 100) : 0,
      interviews: interviews.length,
      offers: offers.length,
      followUps: followUps.length,
    };
  }, [apps]);

  function needsFollowUp(a) {
    if (a.status !== "Applied") return false;
    const anchor = a.followedUpAt || a.dateApplied;
    return daysBetween(anchor, todayISO()) >= 7;
  }

  const visibleApps = useMemo(() => {
    let list = [...apps];
    if (filterStatus === "Needs follow-up") list = list.filter(needsFollowUp);
    else if (filterStatus !== "All") list = list.filter((a) => a.status === filterStatus);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.company.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q) ||
          (a.notes || "").toLowerCase().includes(q)
      );
    }
    // follow-ups first, then newest
    list.sort((x, y) => {
      const fx = needsFollowUp(x) ? 0 : 1;
      const fy = needsFollowUp(y) ? 0 : 1;
      if (fx !== fy) return fx - fy;
      return y.dateApplied.localeCompare(x.dateApplied);
    });
    return list;
  }, [apps, filterStatus, search]);

  /* ── actions ── */
  const openAdd = () => {
    setForm(emptyForm());
    setEditingId(null);
    setShowForm(true);
  };
  const openEdit = (a) => {
    setForm({ ...a });
    setEditingId(a.id);
    setShowForm(true);
  };
  const saveForm = () => {
    if (!form.company.trim() || !form.role.trim()) return;
    let next;
    if (editingId) {
      next = { ...data, apps: apps.map((a) => (a.id === editingId ? { ...a, ...form } : a)) };
    } else {
      next = { ...data, apps: [...apps, { ...form, id: uid() }] };
    }
    persist(next);
    setShowForm(false);
  };
  const removeApp = (id) => {
    if (!window.confirm("Remove this application?")) return;
    persist({ ...data, apps: apps.filter((a) => a.id !== id) });
  };
  const setStatus = (id, status) => {
    persist({ ...data, apps: apps.map((a) => (a.id === id ? { ...a, status } : a)) });
  };
  const markFollowedUp = (id) => {
    persist({ ...data, apps: apps.map((a) => (a.id === id ? { ...a, followedUpAt: todayISO() } : a)) });
  };
  const setTarget = (t) => {
    persist({ ...data, settings: { ...settings, weeklyTarget: t } });
  };
  const runImport = () => {
    let parsed;
    try {
      parsed = JSON.parse(importText);
    } catch {
      setImportMsg({ ok: false, text: "That doesn't look like valid JSON. Copy it again from the extension's Saved tab." });
      return;
    }
    if (!Array.isArray(parsed)) parsed = [parsed];
    const seen = new Set(
      apps.map((a) => (a.link ? "L:" + a.link : "K:" + a.company.toLowerCase() + "|" + a.role.toLowerCase()))
    );
    let added = 0, skipped = 0;
    const incoming = [];
    for (const j of parsed) {
      if (!j || !j.company || !j.role) { skipped++; continue; }
      const key = j.link ? "L:" + j.link : "K:" + String(j.company).toLowerCase() + "|" + String(j.role).toLowerCase();
      if (seen.has(key)) { skipped++; continue; }
      seen.add(key);
      incoming.push({
        id: uid(),
        company: String(j.company),
        role: String(j.role),
        roleType: ROLE_TYPES.includes(j.roleType) ? j.roleType : "Other",
        source: SOURCES.includes(j.source) ? j.source : "Other",
        status: STATUSES.some((s) => s.key === j.status) ? j.status : "Applied",
        dateApplied: /^\d{4}-\d{2}-\d{2}$/.test(j.dateApplied || "") ? j.dateApplied : todayISO(),
        link: j.link || "",
        notes: j.notes || "",
      });
      added++;
    }
    if (added > 0) persist({ ...data, apps: [...apps, ...incoming] });
    setImportMsg({ ok: true, text: `Imported ${added} job(s)` + (skipped ? `, skipped ${skipped} duplicate/invalid.` : ".") });
    if (added > 0) setImportText("");
  };

  /* ── render ── */
  if (loadError)
    return (
      <div style={{ padding: 24, fontFamily: "sans-serif" }}>
        Couldn't load saved data. Refresh to try again.
      </div>
    );
  if (!data)
    return (
      <div style={{ padding: 24, fontFamily: "sans-serif", color: C.inkSoft }}>Loading your tracker…</div>
    );

  const thisWeekCount = weekCounts[currentWeek] || 0;
  const target = settings.weeklyTarget;
  const pace = thisWeekCount >= target ? "on" : thisWeekCount >= Math.ceil(target * 0.5) ? "mid" : "behind";

  return (
    <div className="jt-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .jt-root {
          min-height: 100vh; background: ${C.paper}; color: ${C.ink};
          font-family: 'Archivo', system-ui, sans-serif;
          padding: 20px 16px 80px;
        }
        .jt-wrap { max-width: 860px; margin: 0 auto; }
        .mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; }
        .jt-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
        .jt-title { font-weight: 800; font-size: 26px; letter-spacing: -0.02em; line-height: 1.05; }
        .jt-sub { font-size: 12px; color: ${C.inkSoft}; margin-top: 4px; }
        .jt-weekbadge { font-size: 12px; font-weight: 600; padding: 6px 10px; border: 1px solid ${C.line}; border-radius: 6px; background: ${C.card}; }
        .runway { background: ${C.card}; border: 1px solid ${C.line}; border-radius: 10px; padding: 14px 14px 12px; margin-bottom: 14px; }
        .runway-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px; gap: 8px; flex-wrap: wrap; }
        .runway-label { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: ${C.inkSoft}; font-weight: 700; }
        .runway-cells { display: grid; grid-template-columns: repeat(12, 1fr); gap: 4px; }
        .rcell { border-radius: 4px; height: 44px; position: relative; background: ${C.paper}; border: 1px solid ${C.line}; overflow: hidden; }
        .rcell .fill { position: absolute; bottom: 0; left: 0; right: 0; background: ${C.pine}; opacity: 0.85; transition: height .3s; }
        .rcell.current { border-color: ${C.ink}; border-width: 2px; }
        .rcell .num { position: absolute; top: 2px; left: 0; right: 0; text-align: center; font-size: 10px; color: ${C.inkSoft}; }
        .rcell .cnt { position: absolute; bottom: 2px; left: 0; right: 0; text-align: center; font-size: 10px; font-weight: 600; color: ${C.ink}; z-index: 1; }
        .pace-line { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; gap: 8px; flex-wrap: wrap; }
        .pace-msg { font-size: 13px; font-weight: 600; }
        .target-ctl { display: flex; align-items: center; gap: 6px; font-size: 12px; color: ${C.inkSoft}; }
        .target-ctl button { width: 24px; height: 24px; border: 1px solid ${C.line}; background: ${C.card}; border-radius: 5px; cursor: pointer; font-weight: 700; color: ${C.ink}; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin-bottom: 16px; }
        .stat { background: ${C.card}; border: 1px solid ${C.line}; border-radius: 10px; padding: 10px 12px; }
        .stat .v { font-size: 22px; font-weight: 700; }
        .stat .l { font-size: 11px; color: ${C.inkSoft}; margin-top: 2px; }
        .stat.warn { border-color: ${C.amber}; background: ${C.amberSoft}; }
        .toolbar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 12px; }
        .chip { border: 1px solid ${C.line}; background: ${C.card}; border-radius: 999px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer; color: ${C.inkSoft}; }
        .chip.active { background: ${C.ink}; color: #fff; border-color: ${C.ink}; }
        .search { flex: 1; min-width: 140px; border: 1px solid ${C.line}; border-radius: 8px; padding: 8px 10px; font-size: 13px; background: ${C.card}; font-family: inherit; }
        .addbtn { background: ${C.pine}; color: #fff; border: none; border-radius: 8px; padding: 10px 16px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .addbtn:hover { filter: brightness(1.05); }
        .card { background: ${C.card}; border: 1px solid ${C.line}; border-radius: 10px; padding: 12px 14px; margin-bottom: 8px; }
        .card.flag { border-left: 4px solid ${C.amber}; }
        .crow { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
        .cname { font-weight: 700; font-size: 15px; }
        .crole { font-size: 13px; color: ${C.inkSoft}; margin-top: 1px; }
        .cmeta { font-size: 11px; color: ${C.inkSoft}; margin-top: 6px; display: flex; gap: 10px; flex-wrap: wrap; }
        .badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; }
        .fbadge { font-size: 11px; font-weight: 700; color: ${C.amber}; margin-top: 6px; }
        .cactions { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
        .sm { font-size: 12px; padding: 6px 10px; border-radius: 6px; border: 1px solid ${C.line}; background: ${C.card}; cursor: pointer; font-family: inherit; font-weight: 600; color: ${C.ink}; }
        .sm.danger { color: ${C.red}; }
        select.sm { padding: 5px 6px; }
        .empty { text-align: center; padding: 48px 16px; color: ${C.inkSoft}; background: ${C.card}; border: 1px dashed ${C.line}; border-radius: 10px; }
        .modal-bg { position: fixed; inset: 0; background: rgba(20,35,29,0.45); display: flex; align-items: flex-end; justify-content: center; z-index: 50; }
        @media (min-width: 560px) { .modal-bg { align-items: center; } }
        .modal { background: ${C.card}; border-radius: 14px 14px 0 0; width: 100%; max-width: 520px; padding: 18px; max-height: 92vh; overflow-y: auto; }
        @media (min-width: 560px) { .modal { border-radius: 14px; } }
        .modal h3 { font-size: 17px; font-weight: 800; margin: 0 0 14px; }
        .f { margin-bottom: 10px; }
        .f label { display: block; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: ${C.inkSoft}; margin-bottom: 4px; }
        .f input, .f select, .f textarea { width: 100%; border: 1px solid ${C.line}; border-radius: 8px; padding: 9px 10px; font-size: 14px; font-family: inherit; background: ${C.paper}; box-sizing: border-box; }
        .f2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .modal-actions { display: flex; gap: 8px; margin-top: 14px; }
        .modal-actions .addbtn { flex: 1; }
        .cancel { flex: 1; background: ${C.card}; border: 1px solid ${C.line}; border-radius: 8px; font-weight: 700; cursor: pointer; font-family: inherit; color: ${C.ink}; }
        button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 2px solid ${C.pine}; outline-offset: 1px; }
        a.jlink { color: ${C.blue}; font-size: 12px; text-decoration: none; font-weight: 600; }
      `}</style>

      <div className="jt-wrap">
        {/* Header */}
        <div className="jt-header">
          <div>
            <div className="jt-title">Job Search Runway</div>
            <div className="jt-sub">
              Sprint started {fmtDate(settings.startMonday)} · your data saves automatically
            </div>
          </div>
          <div className="jt-weekbadge mono">
            WEEK {currentWeek + 1} / {TOTAL_WEEKS}
          </div>
        </div>

        {/* Runway strip — signature element */}
        <div className="runway">
          <div className="runway-top">
            <span className="runway-label">12-week runway · applications per week</span>
            <span className="mono" style={{ fontSize: 12, color: C.inkSoft }}>
              target {target}/wk
            </span>
          </div>
          <div className="runway-cells">
            {weekCounts.map((n, i) => {
              const h = Math.min((n / target) * 100, 100);
              return (
                <div key={i} className={"rcell" + (i === currentWeek ? " current" : "")} title={`Week ${i + 1}: ${n} applications`}>
                  <div className="num mono">{i + 1}</div>
                  <div className="fill" style={{ height: h + "%" }} />
                  {n > 0 && <div className="cnt mono">{n}</div>}
                </div>
              );
            })}
          </div>
          <div className="pace-line">
            <span className="pace-msg" style={{ color: pace === "on" ? C.pine : pace === "mid" ? C.amber : C.red }}>
              {pace === "on"
                ? `On pace — ${thisWeekCount}/${target} this week. Keep going.`
                : pace === "mid"
                ? `${thisWeekCount}/${target} this week — ${target - thisWeekCount} more to hit target.`
                : `${thisWeekCount}/${target} this week — behind pace, log some applications.`}
            </span>
            <span className="target-ctl">
              Weekly target
              <button onClick={() => setTarget(Math.max(1, target - 1))} aria-label="Lower target">−</button>
              <b className="mono">{target}</b>
              <button onClick={() => setTarget(target + 1)} aria-label="Raise target">+</button>
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="stats">
          <div className="stat"><div className="v mono">{stats.applied}</div><div className="l">Applied</div></div>
          <div className="stat"><div className="v mono">{stats.heardPct}%</div><div className="l">Heard back</div></div>
          <div className="stat"><div className="v mono">{stats.interviews}</div><div className="l">Interviews</div></div>
          <div className="stat"><div className="v mono">{stats.offers}</div><div className="l">Offers</div></div>
          <div className={"stat" + (stats.followUps ? " warn" : "")}>
            <div className="v mono">{stats.followUps}</div><div className="l">Need follow-up</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="toolbar">
          <button className="addbtn" onClick={openAdd}>+ Log application</button>
          <button className="sm" style={{ padding: "10px 14px", fontSize: 13 }} onClick={() => { setImportMsg(null); setShowImport(true); }}>
            Import
          </button>
          <input
            className="search"
            placeholder="Search company, role, notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="toolbar" role="tablist" aria-label="Filter by status">
          {["All", "Needs follow-up", ...STATUSES.map((s) => s.key)].map((k) => (
            <button
              key={k}
              className={"chip" + (filterStatus === k ? " active" : "")}
              onClick={() => setFilterStatus(k)}
            >
              {k}
            </button>
          ))}
        </div>

        {/* List */}
        {visibleApps.length === 0 ? (
          <div className="empty">
            {apps.length === 0
              ? "No applications yet. Log your first one — the runway starts filling as you go."
              : "Nothing matches this filter."}
          </div>
        ) : (
          visibleApps.map((a) => {
            const m = statusMeta(a.status);
            const flag = needsFollowUp(a);
            const isOpen = expanded === a.id;
            return (
              <div key={a.id} className={"card" + (flag ? " flag" : "")}>
                <div className="crow">
                  <div style={{ minWidth: 0 }}>
                    <div className="cname">{a.company}</div>
                    <div className="crole">{a.role} · {a.roleType}</div>
                    {flag && (
                      <div className="fbadge">
                        ⚑ Follow up — {daysBetween(a.followedUpAt || a.dateApplied, todayISO())} days silent
                      </div>
                    )}
                  </div>
                  <span className="badge" style={{ background: m.soft, color: m.color }}>{a.status}</span>
                </div>
                <div className="cmeta mono">
                  <span>{fmtDate(a.dateApplied)}</span>
                  <span>via {a.source}</span>
                  {a.link && <a className="jlink" href={a.link} target="_blank" rel="noreferrer">Job link ↗</a>}
                </div>
                {isOpen && a.notes && (
                  <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 8, whiteSpace: "pre-wrap" }}>{a.notes}</div>
                )}
                <div className="cactions">
                  <select
                    className="sm"
                    value={a.status}
                    onChange={(e) => setStatus(a.id, e.target.value)}
                    aria-label="Change status"
                  >
                    {STATUSES.map((s) => <option key={s.key}>{s.key}</option>)}
                  </select>
                  {flag && <button className="sm" onClick={() => markFollowedUp(a.id)}>Mark followed up</button>}
                  {a.notes && <button className="sm" onClick={() => setExpanded(isOpen ? null : a.id)}>{isOpen ? "Hide notes" : "Notes"}</button>}
                  <button className="sm" onClick={() => openEdit(a)}>Edit</button>
                  <button className="sm danger" onClick={() => removeApp(a.id)}>Remove</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / edit modal */}
      {showForm && (
        <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal" role="dialog" aria-label={editingId ? "Edit application" : "Log application"}>
            <h3>{editingId ? "Edit application" : "Log application"}</h3>
            <div className="f">
              <label>Company</label>
              <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="e.g. Zoho" />
            </div>
            <div className="f">
              <label>Role title</label>
              <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. Software Engineer I" />
            </div>
            <div className="f2">
              <div className="f">
                <label>Role type</label>
                <select value={form.roleType} onChange={(e) => setForm({ ...form, roleType: e.target.value })}>
                  {ROLE_TYPES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="f">
                <label>Source</label>
                <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                  {SOURCES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="f2">
              <div className="f">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s.key}>{s.key}</option>)}
                </select>
              </div>
              <div className="f">
                <label>Date applied</label>
                <input type="date" value={form.dateApplied} onChange={(e) => setForm({ ...form, dateApplied: e.target.value })} />
              </div>
            </div>
            <div className="f">
              <label>Job link (optional)</label>
              <input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://…" />
            </div>
            <div className="f">
              <label>Notes (optional)</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Referral contact, JD keywords, interview dates…"
              />
            </div>
            <div className="modal-actions">
              <button className="cancel" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="addbtn" onClick={saveForm} disabled={!form.company.trim() || !form.role.trim()}>
                {editingId ? "Save changes" : "Log it"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import modal */}
      {showImport && (
        <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && setShowImport(false)}>
          <div className="modal" role="dialog" aria-label="Import jobs">
            <h3>Import from Job Capture extension</h3>
            <p style={{ fontSize: 13, color: C.inkSoft, marginTop: -6 }}>
              In the extension, open the <b>Saved</b> tab, tap <b>Copy JSON for tracker</b>, then paste below.
              Jobs already in the tracker (same link) are skipped.
            </p>
            <div className="f">
              <label>Pasted JSON</label>
              <textarea
                rows={8}
                className="mono"
                style={{ fontSize: 12 }}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder='[{"company":"Zoho","role":"Software Engineer I", ...}]'
              />
            </div>
            {importMsg && (
              <div style={{ fontSize: 13, fontWeight: 700, color: importMsg.ok ? C.pine : C.red, marginBottom: 6 }}>
                {importMsg.text}
              </div>
            )}
            <div className="modal-actions">
              <button className="cancel" onClick={() => setShowImport(false)}>Close</button>
              <button className="addbtn" onClick={runImport} disabled={!importText.trim()}>Import jobs</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
