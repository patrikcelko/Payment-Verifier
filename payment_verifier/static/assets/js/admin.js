"use strict";

const API = "/api/projects";
const LOGS_API = "/api/logs";
const STATS_API = "/api/logs/stats";
const STATUSES = ["OK", "UNPAID", "PENDING", "OVERDUE", "PARTIAL", "SUSPENDED"];
let allProjects = [];

function toast(msg, type = "success") {
    const c = document.getElementById("toasts");
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(() => el.remove(), 3500);
}

function formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function relativeTime(iso) {
    if (!iso) return "never";
    const now = Date.now(), then = new Date(iso).getTime();
    const diff = Math.floor((now - then) / 1000);
    if (diff < 5) return "just now";
    if (diff < 60) return `${diff}s ago`;
    const m = Math.floor(diff / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ${m % 60}m ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return formatDate(iso);
}

function esc(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
}

function icon(name, w = 13, h = 13, cls = "") {
    return `<img src="/static/assets/icons/${name}.svg" class="svg-icon${cls ? " " + cls : ""}" width="${w}" height="${h}" alt="">`;
}

async function fetchProjects() {
    try {
        const r = await fetch(API);
        const data = await r.json();
        allProjects = data.projects || [];
        render();
    } catch (e) { toast("Failed to load projects", "error"); }
}

async function createProject(name, status) {
    const r = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, status })
    });
    if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Error"); }
    toast(`Project "${name}" created`);
    await fetchProjects();
}

async function updateStatus(id, status) {
    const r = await fetch(`${API}/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
    });
    if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Error"); }
    toast("Status updated");
    await fetchProjects();
}

async function deleteProject(id, name) {
    if (!confirm(`Delete project "${name}"?`)) return;
    const r = await fetch(`${API}/${id}`, { method: "DELETE" });
    if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Error"); }
    toast(`Project "${name}" deleted`);
    await fetchProjects();
}

async function updateProjectDetails(id, body) {
    const r = await fetch(`${API}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    if (!r.ok) { const d = await r.json(); throw new Error(d.detail || "Error"); }
    toast("Project updated");
    await fetchProjects();
}

function infoRow(iconName, content) {
    return `<div class="customer-row">${icon(iconName, 13, 13, "cust-icon")}${content}</div>`;
}

function buildInfoSection(p, fields) {
    const rows = [];
    for (const [key, iconName, opts] of fields) {
        const val = p[key];
        if (!val) continue;
        if (opts && opts.href) {
            const href = opts.hrefFn ? opts.hrefFn(val) : val;
            const label = opts.labelFn ? opts.labelFn(val) : esc(val);
            const ext = opts.external ? ` target="_blank" rel="noopener"` : "";
            const extIcon = opts.external ? `${icon("external-link", 10, 10, "")}` : "";
            rows.push(infoRow(iconName, `<a class="project-link" href="${esc(href)}"${ext}>${label}${extIcon}</a>`));
        } else {
            rows.push(infoRow(iconName, esc(val)));
        }
    }
    return rows.length ? `<div class="customer-section">${rows.join("")}</div>` : "";
}

function buildTimestamps(p) {
    const tags = [
        { icon: "calendar", label: "Created", value: p.created_at },
        { icon: "clock", label: "Updated", value: p.updated_at },
    ];
    if (p.last_queried_at) {
        tags.push({ icon: "activity", label: "Last query", value: p.last_queried_at });
    }
    return tags.map(t =>
        `<span class="meta-tag" title="${t.label}: ${formatDate(t.value)}">${icon(t.icon, 11, 11)}<span class="rel-time" title="${formatDate(t.value)}">${relativeTime(t.value)}</span></span>`
    ).join("");
}

function render() {
    const q = (document.getElementById("search-input").value || "").toLowerCase();
    const filtered = q
        ? allProjects.filter(p => p.name.toLowerCase().includes(q) || p.status.toLowerCase().includes(q) || (p.customer_name && p.customer_name.toLowerCase().includes(q)))
        : allProjects;

    const okCount = allProjects.filter(p => p.status === "OK").length;
    document.getElementById("total-count").textContent = allProjects.length;
    document.getElementById("ok-count").textContent = okCount;
    document.getElementById("blocked-count").textContent = allProjects.length - okCount;
    document.getElementById("count").textContent = filtered.length;

    const grid = document.getElementById("projects-grid");
    const emptyState = document.getElementById("empty-state");
    const emptySearch = document.getElementById("empty-search");

    if (allProjects.length === 0) {
        grid.style.display = "none";
        emptyState.style.display = "block";
        emptySearch.style.display = "none";
        return;
    }
    emptyState.style.display = "none";

    if (filtered.length === 0) {
        grid.style.display = "none";
        emptySearch.style.display = "block";
        return;
    }
    emptySearch.style.display = "none";
    grid.style.display = "grid";

    grid.innerHTML = filtered.map(p => {
        const badgeClass = `status-${p.status.toLowerCase()}`;

        const customerHtml = buildInfoSection(p, [
            ["customer_name", "user"],
            ["customer_address", "map-pin"],
            ["project_url", "link", {
                href: true,
                external: true,
                labelFn: v => esc(v.replace(/^https?:\/\//, "").replace(/\/$/, ""))
            }],
        ]);

        const contactHtml = buildInfoSection(p, [
            ["contact_person", "user"],
            ["contact_email", "mail", { href: true, hrefFn: v => `mailto:${v}` }],
            ["contact_phone", "phone"],
        ]);

        const selectorOpts = STATUSES.map(s => {
            const cls = s === p.status ? "ss-opt active" : "ss-opt";
            return `<div class="${cls}" data-status="${s}" onclick="selectStatus(${p.id},'${s}',this)"><svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>${s}</div>`;
        }).join("");

        return `
        <div class="project">
            <div class="project-header">
                <h3 class="project-name">${esc(p.name)}</h3>

            </div>
            ${customerHtml}
            ${contactHtml}
            <div class="project-meta">${buildTimestamps(p)}</div>
            <div class="project-actions">
                <div class="status-selector" data-project-id="${p.id}">
                    <button class="ss-trigger status-${p.status.toLowerCase()}" onclick="toggleSelector(this)">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>
                        ${esc(p.status)}
                        <svg class="ss-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <div class="ss-dropdown">${selectorOpts}</div>
                </div>
                <button class="btn btn-sm" onclick="quickVerify('${esc(p.name)}',this)">
                    ${icon("check-circle", 12, 12)} Verify
                </button>

                <button class="btn-icon-bare" style="margin-left:auto" onclick="openEditModal(${p.id})" title="Edit">
                    ${icon("edit", 14, 14)}
                </button>
                <button class="btn-icon-bare" onclick="openProjectMsgEditor(${p.id},'${esc(p.name)}')" title="Messages">
                    ${icon("mail", 14, 14)}
                </button>
                <button class="btn-icon-bare btn-icon-danger" onclick="deleteProject(${p.id},'${esc(p.name)}')" title="Delete">
                    ${icon("trash", 14, 14)}
                </button>
            </div>
        </div>`;
    }).join("");
}

function toggleSelector(trigger) {
    const sel = trigger.closest(".status-selector");
    // Close all other open selectors first
    document.querySelectorAll(".status-selector.open").forEach(s => {
        if (s !== sel) s.classList.remove("open");
    });
    sel.classList.toggle("open");
}

async function selectStatus(id, status, optEl) {
    const sel = optEl.closest(".status-selector");
    sel.classList.remove("open");
    try { await updateStatus(id, status); }
    catch (e) { toast(e.message, "error"); }
}

// Close selector on outside click
document.addEventListener("click", e => {
    if (!e.target.closest(".status-selector")) {
        document.querySelectorAll(".status-selector.open").forEach(s => s.classList.remove("open"));
    }
});

function openCreateModal() {
    document.getElementById("modal-title").textContent = "Add Project";
    document.getElementById("modal-project-id").value = "";
    document.getElementById("modal-name").value = "";
    document.getElementById("modal-name").disabled = false;
    document.getElementById("modal-status").value = "OK";
    document.getElementById("modal-customer-name").value = "";
    document.getElementById("modal-customer-address").value = "";
    document.getElementById("modal-project-url").value = "";
    document.getElementById("modal-contact-person").value = "";
    document.getElementById("modal-contact-email").value = "";
    document.getElementById("modal-contact-phone").value = "";
    document.getElementById("modal-name-group").style.display = "";
    document.getElementById("modal-status-group").style.display = "";
    document.getElementById("modal-submit").textContent = "Create";
    document.getElementById("modal-overlay").classList.add("active");
    setTimeout(() => document.getElementById("modal-name").focus(), 100);
}

function openEditModal(id) {
    const p = allProjects.find(x => x.id === id);
    if (!p) return;
    document.getElementById("modal-title").textContent = "Edit - " + p.name;
    document.getElementById("modal-project-id").value = id;
    document.getElementById("modal-name-group").style.display = "none";
    document.getElementById("modal-status-group").style.display = "none";
    document.getElementById("modal-customer-name").value = p.customer_name || "";
    document.getElementById("modal-customer-address").value = p.customer_address || "";
    document.getElementById("modal-project-url").value = p.project_url || "";
    document.getElementById("modal-contact-person").value = p.contact_person || "";
    document.getElementById("modal-contact-email").value = p.contact_email || "";
    document.getElementById("modal-contact-phone").value = p.contact_phone || "";
    document.getElementById("modal-submit").textContent = "Save";
    document.getElementById("modal-overlay").classList.add("active");
    setTimeout(() => document.getElementById("modal-customer-name").focus(), 100);
}

function closeModal() {
    document.getElementById("modal-overlay").classList.remove("active");
}

async function submitModal() {
    const editId = document.getElementById("modal-project-id").value;
    if (editId) {
        const body = {
            customer_name: document.getElementById("modal-customer-name").value.trim() || null,
            customer_address: document.getElementById("modal-customer-address").value.trim() || null,
            project_url: document.getElementById("modal-project-url").value.trim() || null,
            contact_person: document.getElementById("modal-contact-person").value.trim() || null,
            contact_email: document.getElementById("modal-contact-email").value.trim() || null,
            contact_phone: document.getElementById("modal-contact-phone").value.trim() || null
        };
        try { await updateProjectDetails(editId, body); closeModal(); }
        catch (e) { toast(e.message, "error"); }
        return;
    }
    const name = document.getElementById("modal-name").value.trim();
    const status = document.getElementById("modal-status").value;
    if (!name) { toast("Name is required", "error"); return; }
    try { await createProject(name, status); closeModal(); }
    catch (e) { toast(e.message, "error"); }
}

// Close overlays on backdrop click
document.getElementById("modal-overlay").addEventListener("click", e => {
    if (e.target === e.currentTarget) closeModal();
});
document.getElementById("me-global-overlay").addEventListener("click", e => {
    if (e.target === e.currentTarget) closeGlobalMsgEditor();
});
document.getElementById("me-project-overlay").addEventListener("click", e => {
    if (e.target === e.currentTarget) closeProjectMsgEditor();
});

// Search input event
document.getElementById("search-input").addEventListener("input", render);

function switchTab(tab) {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    document.getElementById("tab-" + tab).classList.add("active");
    document.querySelector(`.tab[onclick="switchTab('${tab}')"]`).classList.add("active");
    if (tab === "logs") { fetchLogs(); fetchLogStats(); }
}

async function quickVerify(name, btn) {
    const card = btn.closest(".project");
    const header = card.querySelector(".project-header");
    const existing = header.querySelector(".verify-result");
    if (existing) existing.remove();
    try {
        const r = await fetch(`/?project=${encodeURIComponent(name)}`);
        const body = await r.text();
        const span = document.createElement("span");
        if (r.status === 200) {
            span.className = "verify-result verify-ok";
            span.textContent = "\u2713 OK";
            toast(`${name}: OK`);
        } else if (r.status === 402) {
            let status = "UNPAID", msg = "Payment Required";
            try { const j = JSON.parse(body); status = j.status || status; msg = j.message || msg; } catch (_) { }
            span.className = "verify-result verify-fail";
            span.textContent = "\u2717 " + status;
            toast(`${name}: ${msg}`, "error");
        } else if (r.status === 404) {
            span.className = "verify-result verify-na";
            span.textContent = "? 404";
            toast(`${name}: ${body || "Not found"}`, "error");
        } else {
            span.className = "verify-result verify-na";
            span.textContent = "? " + r.status;
            toast(`${name}: Unexpected status ${r.status}`, "error");
        }
        header.appendChild(span);
        setTimeout(() => span.remove(), 4000);
        await fetchProjects();
    } catch (e) { toast("Verify failed: " + e.message, "error"); }
}

const LOGS_PER_PAGE = 25;
let logsCurrentPage = 0;
let logsTotalCount = 0;
let logsFilterStatus = null;
let logsFilterProject = "";
let autoRefreshInterval = null;

function filterLogs(statusCode) {
    logsFilterStatus = statusCode;
    logsCurrentPage = 0;
    document.querySelectorAll(".filter-chips .chip").forEach(c => c.classList.remove("active"));
    if (statusCode === null) {
        document.querySelector(".filter-chips .chip").classList.add("active");
    } else {
        document.querySelectorAll(".filter-chips .chip").forEach(c => {
            if (c.textContent.startsWith(String(statusCode))) c.classList.add("active");
        });
    }
    fetchLogs();
}

document.getElementById("logs-search-input").addEventListener("input", e => {
    logsFilterProject = e.target.value.trim();
    logsCurrentPage = 0;
    fetchLogs();
});

async function fetchLogStats() {
    try {
        const r = await fetch(STATS_API);
        const s = await r.json();
        const t = s.total || 0;
        const s200 = s["200"] || 0, s402 = s["402"] || 0, s404 = s["404"] || 0;
        document.getElementById("stat-200").textContent = s200;
        document.getElementById("stat-402").textContent = s402;
        document.getElementById("stat-404").textContent = s404;
        document.getElementById("requests-count").textContent = t;
        const badge = document.getElementById("logs-badge");
        if (t > 0) { badge.textContent = t > 999 ? "999+" : t; badge.style.display = "inline-flex"; }
        else { badge.style.display = "none"; }
        const wrap = document.getElementById("stats-bar-wrap");
        if (t > 0) {
            wrap.style.display = "block";
            document.getElementById("bar-200").style.width = `${(s200 / t * 100).toFixed(1)}%`;
            document.getElementById("bar-402").style.width = `${(s402 / t * 100).toFixed(1)}%`;
            document.getElementById("bar-404").style.width = `${(s404 / t * 100).toFixed(1)}%`;
        } else { wrap.style.display = "none"; }
    } catch (e) { /* silent */ }
}

async function fetchLogs() {
    try {
        const offset = logsCurrentPage * LOGS_PER_PAGE;
        let url = `${LOGS_API}?limit=${LOGS_PER_PAGE}&offset=${offset}`;
        if (logsFilterStatus !== null) url += `&status_code=${logsFilterStatus}`;
        if (logsFilterProject) url += `&project_name=${encodeURIComponent(logsFilterProject)}`;
        const r = await fetch(url);
        const data = await r.json();
        logsTotalCount = data.total || 0;
        renderLogs(data.logs || []);
    } catch (e) { toast("Failed to load logs", "error"); }
}

function renderLogs(logs) {
    document.getElementById("logs-total").textContent = logsTotalCount;
    const body = document.getElementById("logs-body");
    const empty = document.getElementById("logs-empty");
    const totalPages = Math.max(1, Math.ceil(logsTotalCount / LOGS_PER_PAGE));
    document.getElementById("logs-page-info").textContent = `${logsCurrentPage + 1} / ${totalPages}`;
    document.getElementById("logs-prev").disabled = logsCurrentPage <= 0;
    document.getElementById("logs-next").disabled = logsCurrentPage >= totalPages - 1;

    if (logs.length === 0 && logsCurrentPage === 0) {
        body.innerHTML = "";
        empty.style.display = "block";
        return;
    }
    empty.style.display = "none";

    body.innerHTML = logs.map(log => {
        const statusClass = [200, 402, 404].includes(log.status_code) ? `log-status-${log.status_code}` : "";
        return `<tr>
            <td><span class="rel-time" title="${formatDate(log.created_at)}">${relativeTime(log.created_at)}</span></td>
            <td class="log-project">${esc(log.project_name)}</td>
            <td><span class="log-status ${statusClass}">${log.status_code}</span></td>
            <td><span class="log-msg" title="${esc(log.response_text)}">${esc(log.response_text)}</span></td>
            <td class="log-ip">${esc(log.client_ip)}</td>
        </tr>`;
    }).join("");
}

function logsPage(dir) {
    const totalPages = Math.max(1, Math.ceil(logsTotalCount / LOGS_PER_PAGE));
    logsCurrentPage = Math.max(0, Math.min(totalPages - 1, logsCurrentPage + dir));
    fetchLogs();
}

function toggleAutoRefresh() {
    const track = document.getElementById("auto-refresh-toggle");
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        track.classList.remove("on");
    } else {
        autoRefreshInterval = setInterval(() => { fetchLogs(); fetchLogStats(); }, 10000);
        track.classList.add("on");
        toast("Auto-refresh ON (10s)");
    }
}

function exportCSV() {
    if (logsTotalCount === 0) { toast("No logs to export", "error"); return; }
    let url = `${LOGS_API}?limit=10000&offset=0`;
    if (logsFilterStatus !== null) url += `&status_code=${logsFilterStatus}`;
    if (logsFilterProject) url += `&project_name=${encodeURIComponent(logsFilterProject)}`;
    fetch(url).then(r => r.json()).then(data => {
        const rows = [["Time", "Project", "Status Code", "Response", "Client IP"]];
        (data.logs || []).forEach(l => {
            rows.push([l.created_at, l.project_name, l.status_code, l.response_text, l.client_ip]);
        });
        const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `payment-verifier-logs-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        toast(`Exported ${data.logs.length} entries`);
    }).catch(() => toast("Export failed", "error"));
}

const MSG_API = "/api/status-messages";

function openGlobalMsgEditor() {
    document.getElementById("me-global-overlay").classList.add("active");
    loadGlobalMessages();
}
function closeGlobalMsgEditor() {
    document.getElementById("me-global-overlay").classList.remove("active");
}

async function loadGlobalMessages() {
    const list = document.getElementById("me-global-list");
    list.innerHTML = `<p style="color:var(--muted);text-align:center">Loading…</p>`;
    try {
        const r = await fetch(MSG_API);
        const data = await r.json();
        list.innerHTML = (data.messages || []).map(m => `
            <div class="me-item">
                <div class="me-item-header">
                    <span class="me-status-pill" style="background:var(--${m.status.toLowerCase()}-bg,var(--overlay));border:1px solid var(--${m.status.toLowerCase()}-border,var(--border));color:var(--${m.status.toLowerCase()},var(--text))">${esc(m.status)}</span>
                </div>
                <textarea class="me-textarea" id="gmsg-${m.status}" rows="2">${esc(m.message)}</textarea>
                <div class="me-item-actions">
                    <button class="btn btn-sm" onclick="saveGlobalMessage('${m.status}')">
                        ${icon("check-circle", 12, 12)} Save
                    </button>
                </div>
            </div>
        `).join("");
    } catch (e) { list.innerHTML = `<p style="color:var(--unpaid)">Failed to load messages</p>`; }
}

async function saveGlobalMessage(status) {
    const msg = document.getElementById(`gmsg-${status}`).value.trim();
    if (!msg) { toast("Message cannot be empty", "error"); return; }
    try {
        const r = await fetch(`${MSG_API}/${status}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: msg })
        });
        if (!r.ok) throw new Error("Failed");
        toast(`Message for ${status} saved`);
    } catch (e) { toast("Failed to save message", "error"); }
}

async function resetAllGlobalMessages() {
    if (!confirm("Reset all global messages to defaults?")) return;
    try {
        const r = await fetch(`${MSG_API}/reset`, { method: "POST" });
        if (!r.ok) throw new Error("Failed");
        toast("All messages reset to defaults");
        loadGlobalMessages();
    } catch (e) { toast("Failed to reset messages", "error"); }
}

let pmsgProjectId = null;

function openProjectMsgEditor(id, name) {
    pmsgProjectId = id;
    document.getElementById("pmsg-project-name").textContent = name;
    document.getElementById("me-project-overlay").classList.add("active");
    loadProjectMessages();
}
function closeProjectMsgEditor() {
    document.getElementById("me-project-overlay").classList.remove("active");
    pmsgProjectId = null;
}

async function loadProjectMessages() {
    if (!pmsgProjectId) return;
    const list = document.getElementById("me-project-list");
    list.innerHTML = `<p style="color:var(--muted);text-align:center">Loading…</p>`;
    try {
        const r = await fetch(`${API}/${pmsgProjectId}/messages`);
        const data = await r.json();
        list.innerHTML = (data.messages || []).map(m => `
            <div class="me-item">
                <div class="me-item-header">
                    <span class="me-status-pill" style="background:var(--${m.status.toLowerCase()}-bg,var(--overlay));border:1px solid var(--${m.status.toLowerCase()}-border,var(--border));color:var(--${m.status.toLowerCase()},var(--text))">${esc(m.status)}</span>
                    ${m.is_custom ? `<span class="me-custom-badge">Custom</span>` : `<span class="me-default-badge">Default</span>`}
                </div>
                <textarea class="me-textarea" id="pmsg-${m.status}" rows="2">${esc(m.message)}</textarea>
                <div class="me-item-actions">
                    <button class="btn btn-sm" onclick="saveProjectMessage('${m.status}')">
                        ${icon("check-circle", 12, 12)} Save
                    </button>
                    ${m.is_custom ? `<button class="btn btn-sm btn-danger" onclick="removeProjectMessage('${m.status}')">Remove Override</button>` : ""}
                </div>
            </div>
        `).join("");
    } catch (e) { list.innerHTML = `<p style="color:var(--unpaid)">Failed to load messages</p>`; }
}

async function saveProjectMessage(status) {
    if (!pmsgProjectId) return;
    const msg = document.getElementById(`pmsg-${status}`).value.trim();
    if (!msg) { toast("Message cannot be empty", "error"); return; }
    try {
        const r = await fetch(`${API}/${pmsgProjectId}/messages/${status}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: msg })
        });
        if (!r.ok) throw new Error("Failed");
        toast(`Custom message for ${status} saved`);
        loadProjectMessages();
    } catch (e) { toast("Failed to save message", "error"); }
}

async function removeProjectMessage(status) {
    if (!pmsgProjectId) return;
    try {
        const r = await fetch(`${API}/${pmsgProjectId}/messages/${status}`, { method: "DELETE" });
        if (!r.ok) throw new Error("Failed");
        toast(`Custom override for ${status} removed`);
        loadProjectMessages();
    } catch (e) { toast("Failed to remove override", "error"); }
}

async function resetAllProjectMessages() {
    if (!pmsgProjectId) return;
    if (!confirm("Remove all custom message overrides for this project?")) return;
    try {
        const r = await fetch(`${API}/${pmsgProjectId}/messages/reset`, { method: "POST" });
        if (!r.ok) throw new Error("Failed");
        toast("All project overrides removed");
        loadProjectMessages();
    } catch (e) { toast("Failed to reset messages", "error"); }
}

document.addEventListener("keydown", e => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") return;
    if (e.key === "Escape") { closeModal(); closeGlobalMsgEditor(); closeProjectMsgEditor(); }
    if (e.key === "n" || e.key === "N") { e.preventDefault(); openCreateModal(); }
    if (e.key === "m" || e.key === "M") { e.preventDefault(); openGlobalMsgEditor(); }
    if (e.key === "1") switchTab("projects");
    if (e.key === "2") switchTab("logs");
    if (e.key === "r" || e.key === "R") { e.preventDefault(); fetchProjects(); fetchLogStats(); }
});

fetchProjects();
fetchLogStats();
