import { state } from "@/state";
import { LOGS_API, STATS_API, authFetch, toast } from "@/core/api";
import { escHtml, formatDate, relativeTime } from "@/core/utils";

const LOGS_PER_PAGE = 25;

export async function fetchLogStats(): Promise<void> {
    try {
        const r = await authFetch(STATS_API);
        const s = await r.json();
        const t: number = s.total || 0;
        const s200: number = s["200"] || 0;
        const s402: number = s["402"] || 0;
        const s404: number = s["404"] || 0;

        document.getElementById("stat-200")!.textContent = String(s200);
        document.getElementById("stat-402")!.textContent = String(s402);
        document.getElementById("stat-404")!.textContent = String(s404);
        document.getElementById("requests-count")!.textContent = String(t);

        const badge = document.getElementById("logs-badge") as HTMLElement;
        if (t > 0) {
            badge.textContent = t > 999 ? "999+" : String(t);
            badge.style.display = "inline-flex";
        } else {
            badge.style.display = "none";
        }

        const wrap = document.getElementById("stats-bar-wrap") as HTMLElement;
        if (t > 0) {
            wrap.style.display = "block";
            (document.getElementById("bar-200") as HTMLElement).style.width = `${(s200 / t * 100).toFixed(1)}%`;
            (document.getElementById("bar-402") as HTMLElement).style.width = `${(s402 / t * 100).toFixed(1)}%`;
            (document.getElementById("bar-404") as HTMLElement).style.width = `${(s404 / t * 100).toFixed(1)}%`;
        } else {
            wrap.style.display = "none";
        }
    } catch (_e) {
        toast("Failed to load log stats", "error");
    }
}

export async function fetchLogs(): Promise<void> {
    try {
        const offset = state.logsCurrentPage * LOGS_PER_PAGE;
        let url = `${LOGS_API}?limit=${LOGS_PER_PAGE}&offset=${offset}`;
        if (state.logsFilterStatus !== null) url += `&status_code=${state.logsFilterStatus}`;
        if (state.logsFilterProject) url += `&project_name=${encodeURIComponent(state.logsFilterProject)}`;
        const r = await authFetch(url);
        const data = await r.json();
        state.logsTotalCount = data.total || 0;
        renderLogs(data.logs || []);
    } catch (_e) {
        toast("Failed to load logs", "error");
    }
}

interface LogRow {
    created_at: string;
    project_name: string;
    status_code: number;
    response_text: string;
    client_ip: string;
}

function renderLogs(logs: LogRow[]): void {
    document.getElementById("logs-total")!.textContent = String(state.logsTotalCount);
    const body = document.getElementById("logs-body") as HTMLElement;
    const empty = document.getElementById("logs-empty") as HTMLElement;
    const totalPages = Math.max(1, Math.ceil(state.logsTotalCount / LOGS_PER_PAGE));

    document.getElementById("logs-page-info")!.textContent = `${state.logsCurrentPage + 1} / ${totalPages}`;
    (document.getElementById("logs-prev") as HTMLButtonElement).disabled = state.logsCurrentPage <= 0;
    (document.getElementById("logs-next") as HTMLButtonElement).disabled = state.logsCurrentPage >= totalPages - 1;

    if (logs.length === 0 && state.logsCurrentPage === 0) {
        body.innerHTML = "";
        empty.style.display = "block";
        return;
    }
    empty.style.display = "none";

    body.innerHTML = logs.map(log => {
        const statusClass = [200, 402, 404].includes(log.status_code) ? `log-status-${log.status_code}` : "";
        return `<tr>
            <td><span class="rel-time" title="${formatDate(log.created_at)}">${relativeTime(log.created_at)}</span></td>
            <td class="log-project">${escHtml(log.project_name)}</td>
            <td><span class="log-status ${statusClass}">${log.status_code}</span></td>
            <td><span class="log-msg" title="${escHtml(log.response_text)}">${escHtml(log.response_text)}</span></td>
            <td class="log-ip">${escHtml(log.client_ip)}</td>
        </tr>`;
    }).join("");
}

export function filterLogs(statusCode: number | null): void {
    state.logsFilterStatus = statusCode;
    state.logsCurrentPage = 0;
    document.querySelectorAll(".filter-chips .chip").forEach(c => c.classList.remove("active"));
    if (statusCode === null) {
        document.querySelector(".filter-chips .chip")?.classList.add("active");
    } else {
        document.querySelectorAll(".filter-chips .chip").forEach(c => {
            if (c.textContent?.startsWith(String(statusCode))) c.classList.add("active");
        });
    }
    fetchLogs();
}

export function logsPage(dir: number): void {
    const totalPages = Math.max(1, Math.ceil(state.logsTotalCount / LOGS_PER_PAGE));
    state.logsCurrentPage = Math.max(0, Math.min(totalPages - 1, state.logsCurrentPage + dir));
    fetchLogs();
}

export function toggleAutoRefresh(): void {
    const track = document.getElementById("auto-refresh-toggle") as HTMLInputElement;
    if (state.autoRefreshInterval) {
        clearInterval(state.autoRefreshInterval);
        state.autoRefreshInterval = null;
        track.checked = false;
    } else {
        state.autoRefreshInterval = setInterval(() => { fetchLogs(); fetchLogStats(); }, 10000);
        track.checked = true;
        toast("Auto-refresh ON (10s)");
    }
}

export function exportCSV(): void {
    if (state.logsTotalCount === 0) { toast("No logs to export", "error"); return; }
    let url = `${LOGS_API}?limit=10000&offset=0`;
    if (state.logsFilterStatus !== null) url += `&status_code=${state.logsFilterStatus}`;
    if (state.logsFilterProject) url += `&project_name=${encodeURIComponent(state.logsFilterProject)}`;
    authFetch(url)
        .then(r => r.json())
        .then(data => {
            const rows: string[][] = [["Time", "Project", "Status Code", "Response", "Client IP"]];
            (data.logs || []).forEach((l: LogRow) => {
                rows.push([l.created_at, l.project_name, String(l.status_code), l.response_text, l.client_ip]);
            });
            const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `payment-verifier-logs-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(a.href);
            toast(`Exported ${data.logs.length} entries`);
        })
        .catch(() => toast("Export failed", "error"));
}

export function handleLogsSearchInput(e: Event): void {
    state.logsFilterProject = (e.target as HTMLInputElement).value.trim();
    state.logsCurrentPage = 0;

    const infoLabel = document.getElementById("logs-filter-info") as HTMLElement;
    if (state.logsFilterProject) {
        infoLabel.innerHTML = `<img src="/static/assets/icons/search.svg" class="svg-icon" width="12" height="12" alt="">Filtered: <strong>${escHtml(state.logsFilterProject)}</strong>`;
    } else {
        infoLabel.innerHTML = `<img src="/static/assets/icons/check-circle.svg" class="svg-icon" width="12" height="12" alt="">Your projects + 404 responses`;
    }

    fetchLogs();
}
