export function escHtml(s: string): string {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function icon(name: string, w = 13, h = 13, cls = ""): string {
    return `<img src="/static/assets/icons/${name}.svg" class="svg-icon${cls ? " " + cls : ""}" width="${w}" height="${h}" alt="">`;
}

export function formatDate(iso: string | null): string {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function relativeTime(iso: string | null): string {
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

export function copyToClipboard(text: string, showToast: (msg: string, type?: "success" | "error" | "info") => void): void {
    navigator.clipboard.writeText(text).then(() => {
        showToast("Verification link copied to clipboard");
    }).catch(() => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand("copy");
            showToast("Verification link copied to clipboard");
        } catch (_e) {
            showToast("Failed to copy link", "error");
        }
        document.body.removeChild(textArea);
    });
}
