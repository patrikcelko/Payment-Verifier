const API = "/api/projects";
const LOGS_API = "/api/logs";
const STATS_API = "/api/logs/stats";
const AUTH_API = "/auth";
const MSG_API = "/api/status-messages";

export { API, LOGS_API, STATS_API, AUTH_API, MSG_API };

export function getToken(): string | null {
    return localStorage.getItem("auth_token");
}

export function setToken(token: string): void {
    localStorage.setItem("auth_token", token);
}

export function clearToken(): void {
    localStorage.removeItem("auth_token");
}

export function isAuthenticated(): boolean {
    return !!getToken();
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = getToken();
    if (!token) {
        // Lazy import to avoid circular dependency
        const { showAuthModal } = await import("@/core/auth");
        showAuthModal();
        throw new Error("Not authenticated");
    }

    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${token}`);

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        clearToken();
        const { showAuthModal } = await import("@/core/auth");
        showAuthModal();
        throw new Error("Authentication failed");
    }

    return response;
}

export async function apiCall(url: string, options: RequestInit = {}): Promise<Response> {
    const r = await authFetch(url, options);
    if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.detail || `API Error: ${r.status}`);
    }
    return r;
}

export function toast(msg: string, type: "success" | "error" | "info" = "success"): void {
    const c = document.getElementById("toasts");
    if (!c) return;
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(() => {
        el.classList.add("fade-out");
        el.addEventListener("animationend", () => el.remove());
    }, 3500);
}
