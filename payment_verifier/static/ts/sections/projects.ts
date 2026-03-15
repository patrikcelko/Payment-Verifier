import { state } from "@/state";
import { STATUSES } from "@/types";
import type { Project } from "@/types";
import { API, authFetch, apiCall, toast } from "@/core/api";
import { escHtml, icon, formatDate, relativeTime, copyToClipboard } from "@/core/utils";
import { confirmPopup } from "@/core/ui";

export async function fetchProjects(): Promise<void> {
    try {
        const r = await authFetch(API);
        const data = await r.json();
        state.allProjects = data.projects || [];
        render();
    } catch (_e) {
        toast("Failed to load projects", "error");
    }
}

export async function createProject(name: string, status: string, details: Record<string, string | null> = {}): Promise<void> {
    const body = { name, status, ...details };
    await apiCall(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    toast(`Project "${name}" created`);
    await fetchProjects();
}

export async function updateStatus(id: number, status: string): Promise<void> {
    await apiCall(`${API}/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
    });
    toast("Status updated");
    await fetchProjects();
}

export async function deleteProject(id: number, name: string): Promise<void> {
    const yes = await confirmPopup("Delete project", `Delete project "${name}"?`);
    if (!yes) return;
    await apiCall(`${API}/${id}`, { method: "DELETE" });
    toast(`Project "${name}" deleted`);
    await fetchProjects();
}

export async function updateProjectDetails(id: number, body: Record<string, string | null>): Promise<void> {
    await apiCall(`${API}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    toast("Project updated");
    await fetchProjects();
}

function infoRow(iconName: string, content: string): string {
    return `<div class="customer-row">${icon(iconName, 13, 13, "cust-icon")}${content}</div>`;
}

type FieldSpec = [
    keyof Project,
    string,
    ({ href: true; external?: boolean; hrefFn?: (v: string) => string; labelFn?: (v: string) => string } | undefined)?,
];

function buildInfoSection(p: Project, fields: FieldSpec[]): string {
    const rows: string[] = [];
    for (const [key, iconName, opts] of fields) {
        const val = p[key] as string | null;
        if (!val) continue;
        if (opts?.href) {
            const href = opts.hrefFn ? opts.hrefFn(val) : val;
            const label = opts.labelFn ? opts.labelFn(val) : escHtml(val);
            const ext = opts.external ? ` target="_blank" rel="noopener"` : "";
            const extIcon = opts.external ? icon("external-link", 10, 10) : "";
            rows.push(infoRow(iconName, `<a class="project-link" href="${escHtml(href)}"${ext}>${label}${extIcon}</a>`));
        } else {
            rows.push(infoRow(iconName, escHtml(val)));
        }
    }
    return rows.length ? `<div class="customer-section">${rows.join("")}</div>` : "";
}

function buildTimestamps(p: Project): string {
    const tags: { icon: string; label: string; value: string | null }[] = [
        { icon: "calendar", label: "Created", value: p.created_at },
        { icon: "clock", label: "Updated", value: p.updated_at },
    ];
    if (p.last_queried_at) {
        tags.push({ icon: "activity", label: "Last query", value: p.last_queried_at });
    }
    return tags.map(t =>
        `<span class="meta-tag" title="${t.label}: ${formatDate(t.value)}">${icon(t.icon, 11, 11)}<span class="rel-time" title="${formatDate(t.value)}">${relativeTime(t.value)}</span></span>`,
    ).join("");
}

export function render(): void {
    const q = ((document.getElementById("search-input") as HTMLInputElement)?.value || "").toLowerCase();
    const filtered = q
        ? state.allProjects.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.status.toLowerCase().includes(q) ||
            (p.customer_name && p.customer_name.toLowerCase().includes(q)))
        : state.allProjects;

    const okCount = state.allProjects.filter(p => p.status === "OK").length;
    const el = (id: string) => document.getElementById(id);
    el("total-count")!.textContent = String(state.allProjects.length);
    el("ok-count")!.textContent = String(okCount);
    el("blocked-count")!.textContent = String(state.allProjects.length - okCount);
    const countEl = el("count");
    if (countEl) countEl.textContent = String(filtered.length);

    const grid = el("projects-grid") as HTMLElement;
    const emptyState = el("empty-state") as HTMLElement;
    const emptySearch = el("empty-search") as HTMLElement;

    if (state.allProjects.length === 0) {
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
        const customerHtml = buildInfoSection(p, [
            ["customer_name", "user"],
            ["customer_address", "map-pin"],
            ["project_url", "link", {
                href: true,
                external: true,
                labelFn: v => escHtml(v.replace(/^https?:\/\//, "").replace(/\/$/, "")),
            }],
        ]);

        const contactHtml = buildInfoSection(p, [
            ["contact_person", "user"],
            ["contact_email", "mail", { href: true, hrefFn: v => `mailto:${v}` }],
            ["contact_phone", "phone"],
        ]);

        const verifyUrl = `${window.location.origin}/?token=${p.api_token}`;

        const selectorOpts = STATUSES.map(s => {
            const cls = s === p.status ? "ss-opt active" : "ss-opt";
            return `<div class="${cls}" data-status="${s}" onclick="selectStatus(${p.id},'${s}',this)"><svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>${s}</div>`;
        }).join("");

        return `
        <div class="project-card">
            <div class="project-header">
                <h3 class="project-name">${escHtml(p.name)}</h3>
            </div>
            ${customerHtml}
            ${contactHtml}
            <div class="verify-url-bar">
                <input type="text" value="${escHtml(verifyUrl)}" readonly onclick="this.select();">
                <button onclick="copyVerifyUrl('${escHtml(verifyUrl)}')" title="Copy">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
            </div>
            <div class="project-actions">
                <div class="status-selector" data-project-id="${p.id}">
                    <button class="ss-trigger status-${p.status.toLowerCase()}" onclick="toggleSelector(this)">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>
                        ${escHtml(p.status)}
                        <svg class="ss-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <div class="ss-dropdown">${selectorOpts}</div>
                </div>
                <button class="btn btn-sm" onclick="quickVerify('${escHtml(p.name)}',this)">
                    ${icon("check-circle", 12, 12)} Verify
                </button>
                <button class="btn-icon-bare ml-auto" onclick="openEditModal(${p.id})" title="Edit">
                    ${icon("edit", 14, 14)}
                </button>
                <button class="btn-icon-bare" onclick="openProjectMsgEditor(${p.id},'${escHtml(p.name)}')" title="Messages">
                    ${icon("mail", 14, 14)}
                </button>
                <button class="btn-icon-bare btn-icon-danger" onclick="deleteProject(${p.id},'${escHtml(p.name)}')" title="Delete">
                    ${icon("trash", 14, 14)}
                </button>
            </div>
            <div class="project-meta">${buildTimestamps(p)}</div>
        </div>`;
    }).join("");
}

export function toggleSelector(trigger: HTMLElement): void {
    const sel = trigger.closest(".status-selector") as HTMLElement;
    document.querySelectorAll(".status-selector.open").forEach(s => {
        if (s !== sel) s.classList.remove("open");
    });
    sel.classList.toggle("open");
}

export async function selectStatus(id: number, status: string, optEl: HTMLElement): Promise<void> {
    const sel = optEl.closest(".status-selector") as HTMLElement;
    sel.classList.remove("open");
    try {
        await updateStatus(id, status);
    } catch (e) {
        toast((e as Error).message, "error");
    }
}

const MODAL_FIELD_IDS: Record<string, string> = {
    id: "modal-project-id",
    name: "modal-name",
    status: "modal-status",
    customerName: "modal-customer-name",
    customerAddress: "modal-customer-address",
    projectUrl: "modal-project-url",
    contactPerson: "modal-contact-person",
    contactEmail: "modal-contact-email",
    contactPhone: "modal-contact-phone",
};

function getModalEl(key: string): HTMLInputElement | HTMLSelectElement {
    return document.getElementById(MODAL_FIELD_IDS[key]) as HTMLInputElement | HTMLSelectElement;
}

function clearModalFields(): void {
    Object.keys(MODAL_FIELD_IDS).forEach(key => {
        getModalEl(key).value = "";
    });
}

export function openCreateModal(): void {
    clearModalFields();
    (getModalEl("name") as HTMLInputElement).disabled = false;
    getModalEl("status").value = "OK";
    document.getElementById("modal-title")!.textContent = "Add Project";
    document.getElementById("modal-name-group")!.style.display = "";
    document.getElementById("modal-status-group")!.style.display = "";
    document.getElementById("modal-submit")!.textContent = "Create";
    document.getElementById("modal-overlay")!.classList.add("show");
    setTimeout(() => getModalEl("name").focus(), 100);
}

export function openEditModal(id: number): void {
    const p = state.allProjects.find(x => x.id === id);
    if (!p) return;
    getModalEl("id").value = String(id);
    getModalEl("customerName").value = p.customer_name || "";
    getModalEl("customerAddress").value = p.customer_address || "";
    getModalEl("projectUrl").value = p.project_url || "";
    getModalEl("contactPerson").value = p.contact_person || "";
    getModalEl("contactEmail").value = p.contact_email || "";
    getModalEl("contactPhone").value = p.contact_phone || "";
    document.getElementById("modal-title")!.textContent = "Edit - " + p.name;
    document.getElementById("modal-name-group")!.style.display = "none";
    document.getElementById("modal-status-group")!.style.display = "none";
    document.getElementById("modal-submit")!.textContent = "Save";
    document.getElementById("modal-overlay")!.classList.add("show");
    setTimeout(() => getModalEl("customerName").focus(), 100);
}

export function closeProjectModal(): void {
    document.getElementById("modal-overlay")?.classList.remove("show");
}

export async function submitModal(): Promise<void> {
    const editId = getModalEl("id").value;

    const details: Record<string, string | null> = {
        customer_name: getModalEl("customerName").value.trim() || null,
        customer_address: getModalEl("customerAddress").value.trim() || null,
        project_url: getModalEl("projectUrl").value.trim() || null,
        contact_person: getModalEl("contactPerson").value.trim() || null,
        contact_email: getModalEl("contactEmail").value.trim() || null,
        contact_phone: getModalEl("contactPhone").value.trim() || null,
    };

    try {
        if (editId) {
            await updateProjectDetails(Number(editId), details);
        } else {
            const name = getModalEl("name").value.trim();
            const status = getModalEl("status").value;
            if (!name) { toast("Name is required", "error"); return; }
            await createProject(name, status, details);
        }
        closeProjectModal();
    } catch (e) {
        toast((e as Error).message, "error");
    }
}

export async function quickVerify(name: string, btn: HTMLElement): Promise<void> {
    const card = btn.closest(".project-card") as HTMLElement;
    const header = card.querySelector(".project-header") as HTMLElement;
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
            try { const j = JSON.parse(body); status = j.status || status; msg = j.message || msg; } catch (_) { /* ignore */ }
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
    } catch (e) {
        toast("Verify failed: " + (e as Error).message, "error");
    }
}

export function copyVerifyUrl(url: string): void {
    copyToClipboard(url, toast);
}
