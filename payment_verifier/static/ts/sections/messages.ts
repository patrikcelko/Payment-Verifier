import { state } from "@/state";
import { API, MSG_API, authFetch, apiCall, toast } from "@/core/api";
import { escHtml, icon } from "@/core/utils";
import { confirmPopup } from "@/core/ui";

export function openGlobalMsgEditor(): void {
    document.getElementById("me-global-overlay")?.classList.add("show");
    loadGlobalMessages();
}

export function closeGlobalMsgEditor(): void {
    document.getElementById("me-global-overlay")?.classList.remove("show");
}

export async function loadGlobalMessages(): Promise<void> {
    const list = document.getElementById("me-global-list") as HTMLElement;
    list.innerHTML = `<p class="me-loading">Loading\u2026</p>`;
    try {
        const r = await authFetch(MSG_API);
        const data = await r.json();
        list.innerHTML = (data.messages || []).map((m: { status: string; message: string }) => `
            <div class="me-item">
                <div class="me-item-header">
                    <span class="me-status-pill" style="background:var(--${m.status.toLowerCase()}-bg,var(--overlay));border:1px solid var(--${m.status.toLowerCase()}-border,var(--border));color:var(--${m.status.toLowerCase()},var(--text))">${escHtml(m.status)}</span>
                </div>
                <textarea class="me-textarea" id="gmsg-${m.status}" rows="2">${escHtml(m.message)}</textarea>
                <div class="me-item-actions">
                    <button class="btn btn-sm" onclick="saveGlobalMessage('${m.status}')">
                        ${icon("check-circle", 12, 12)} Save
                    </button>
                </div>
            </div>
        `).join("");
    } catch (_e) {
        list.innerHTML = `<p class="me-error">Failed to load messages</p>`;
    }
}

export async function saveGlobalMessage(status: string): Promise<void> {
    const msg = (document.getElementById(`gmsg-${status}`) as HTMLTextAreaElement).value.trim();
    if (!msg) { toast("Message cannot be empty", "error"); return; }
    try {
        await apiCall(`${MSG_API}/${status}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: msg }),
        });
        toast(`Message for ${status} saved`);
    } catch (_e) {
        toast("Failed to save message", "error");
    }
}

export async function resetAllGlobalMessages(): Promise<void> {
    const yes = await confirmPopup("Reset messages", "Reset all global messages to defaults?");
    if (!yes) return;
    try {
        await apiCall(`${MSG_API}/reset`, { method: "POST" });
        toast("All messages reset to defaults");
        loadGlobalMessages();
    } catch (_e) {
        toast("Failed to reset messages", "error");
    }
}

export function openProjectMsgEditor(id: number, name: string): void {
    state.pmsgProjectId = id;
    document.getElementById("pmsg-project-name")!.textContent = name;
    document.getElementById("me-project-overlay")?.classList.add("show");
    loadProjectMessages();
}

export function closeProjectMsgEditor(): void {
    document.getElementById("me-project-overlay")?.classList.remove("show");
    state.pmsgProjectId = null;
}

export async function loadProjectMessages(): Promise<void> {
    if (!state.pmsgProjectId) return;
    const list = document.getElementById("me-project-list") as HTMLElement;
    list.innerHTML = `<p class="me-loading">Loading\u2026</p>`;
    try {
        const r = await authFetch(`${API}/${state.pmsgProjectId}/messages`);
        const data = await r.json();
        list.innerHTML = (data.messages || []).map((m: { status: string; message: string; is_custom: boolean }) => `
            <div class="me-item">
                <div class="me-item-header">
                    <span class="me-status-pill" style="background:var(--${m.status.toLowerCase()}-bg,var(--overlay));border:1px solid var(--${m.status.toLowerCase()}-border,var(--border));color:var(--${m.status.toLowerCase()},var(--text))">${escHtml(m.status)}</span>
                    ${m.is_custom ? `<span class="me-custom-badge">Custom</span>` : `<span class="me-default-badge">Default</span>`}
                </div>
                <textarea class="me-textarea" id="pmsg-${m.status}" rows="2">${escHtml(m.message)}</textarea>
                <div class="me-item-actions">
                    <button class="btn btn-sm" onclick="saveProjectMessage('${m.status}')">
                        ${icon("check-circle", 12, 12)} Save
                    </button>
                    ${m.is_custom ? `<button class="btn btn-sm btn-danger" onclick="removeProjectMessage('${m.status}')">Remove Override</button>` : ""}
                </div>
            </div>
        `).join("");
    } catch (_e) {
        list.innerHTML = `<p class="me-error">Failed to load messages</p>`;
    }
}

export async function saveProjectMessage(status: string): Promise<void> {
    if (!state.pmsgProjectId) return;
    const msg = (document.getElementById(`pmsg-${status}`) as HTMLTextAreaElement).value.trim();
    if (!msg) { toast("Message cannot be empty", "error"); return; }
    try {
        await apiCall(`${API}/${state.pmsgProjectId}/messages/${status}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: msg }),
        });
        toast(`Custom message for ${status} saved`);
        loadProjectMessages();
    } catch (_e) {
        toast("Failed to save message", "error");
    }
}

export async function removeProjectMessage(status: string): Promise<void> {
    if (!state.pmsgProjectId) return;
    try {
        await apiCall(`${API}/${state.pmsgProjectId}/messages/${status}`, { method: "DELETE" });
        toast(`Custom override for ${status} removed`);
        loadProjectMessages();
    } catch (_e) {
        toast("Failed to remove override", "error");
    }
}

export async function resetAllProjectMessages(): Promise<void> {
    if (!state.pmsgProjectId) return;
    const yes = await confirmPopup("Reset overrides", "Remove all custom message overrides for this project?");
    if (!yes) return;
    try {
        await apiCall(`${API}/${state.pmsgProjectId}/messages/reset`, { method: "POST" });
        toast("All project overrides removed");
        loadProjectMessages();
    } catch (_e) {
        toast("Failed to reset messages", "error");
    }
}
