import { describe, it, expect, beforeEach, vi } from "vitest";
import { switchTab, confirmPopup, confirmYes, confirmNo } from "@/core/ui";

vi.mock("@/sections/logs", () => ({
    fetchLogs: vi.fn(),
    fetchLogStats: vi.fn(),
}));

describe("switchTab", () => {
    beforeEach(() => {
        document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
        document.querySelectorAll(".section-tab").forEach(el => el.classList.remove("active"));
        document.getElementById("tab-projects")!.classList.add("active");
        document.querySelector('.section-tab[data-tab="projects"]')!.classList.add("active");
    });

    it("switches to projects tab", () => {
        switchTab("projects");
        expect(document.getElementById("tab-projects")!.classList.contains("active")).toBe(true);
        expect(document.querySelector('.section-tab[data-tab="projects"]')!.classList.contains("active")).toBe(true);
    });

    it("switches to logs tab", () => {
        switchTab("logs");
        expect(document.getElementById("tab-logs")!.classList.contains("active")).toBe(true);
        expect(document.querySelector('.section-tab[data-tab="logs"]')!.classList.contains("active")).toBe(true);
        expect(document.getElementById("tab-projects")!.classList.contains("active")).toBe(false);
    });
});

describe("confirmPopup", () => {
    it("shows the confirm overlay and resolves on confirmYes", async () => {
        const promise = confirmPopup("Title", "Are you sure?");
        const overlay = document.getElementById("confirm-overlay")!;
        expect(overlay.classList.contains("show")).toBe(true);

        const h4 = overlay.querySelector("h4")!;
        expect(h4.textContent).toBe("Title");

        const p = overlay.querySelector("p")!;
        expect(p.textContent).toBe("Are you sure?");

        confirmYes();
        expect(overlay.classList.contains("show")).toBe(false);
        expect(await promise).toBe(true);
    });

    it("resolves false on confirmNo", async () => {
        const promise = confirmPopup("Delete", "Really?");
        confirmNo();
        expect(await promise).toBe(false);
    });
});

