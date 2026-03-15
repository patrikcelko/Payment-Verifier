export function switchTab(tab: string): void {
    document.querySelectorAll(".section-tab[data-tab]").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

    const tabContent = document.getElementById("tab-" + tab);
    if (tabContent) tabContent.classList.add("active");

    const tabBtn = document.querySelector(`.section-tab[data-tab="${tab}"]`) as HTMLElement | null;
    if (tabBtn) tabBtn.classList.add("active");

    if (tab === "logs") {
        import("@/sections/logs").then(({ fetchLogs, fetchLogStats }) => {
            fetchLogs();
            fetchLogStats();
        });
    }
}

let confirmResolve: ((value: boolean) => void) | null = null;

export function confirmPopup(title: string, message: string): Promise<boolean> {
    const overlay = document.getElementById("confirm-overlay") as HTMLElement;
    const titleEl = overlay.querySelector("h4") as HTMLElement;
    const msgEl = overlay.querySelector("p") as HTMLElement;

    titleEl.textContent = title;
    msgEl.textContent = message;
    overlay.classList.add("show");

    return new Promise<boolean>((resolve) => {
        confirmResolve = resolve;
    });
}

export function confirmYes(): void {
    document.getElementById("confirm-overlay")?.classList.remove("show");
    if (confirmResolve) {
        confirmResolve(true);
        confirmResolve = null;
    }
}

export function confirmNo(): void {
    document.getElementById("confirm-overlay")?.classList.remove("show");
    if (confirmResolve) {
        confirmResolve(false);
        confirmResolve = null;
    }
}
