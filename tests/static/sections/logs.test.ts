import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { state } from "@/state";
import { fetchLogs, fetchLogStats, filterLogs, logsPage, toggleAutoRefresh, exportCSV, handleLogsSearchInput } from "@/sections/logs";

// Mock authFetch
vi.mock("@/core/api", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/core/api")>();
    return {
        ...actual,
        authFetch: vi.fn(),
        toast: vi.fn(),
    };
});

import { authFetch, toast } from "@/core/api";
const mockAuthFetch = vi.mocked(authFetch);
const mockToast = vi.mocked(toast);

describe("fetchLogStats", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("updates stat elements on success", async () => {
        mockAuthFetch.mockResolvedValue(new Response(JSON.stringify({
            total: 100, "200": 70, "402": 20, "404": 10,
        })));

        await fetchLogStats();

        expect(document.getElementById("stat-200")!.textContent).toBe("70");
        expect(document.getElementById("stat-402")!.textContent).toBe("20");
        expect(document.getElementById("stat-404")!.textContent).toBe("10");
        expect(document.getElementById("requests-count")!.textContent).toBe("100");
    });

    it("shows badge when total > 0", async () => {
        mockAuthFetch.mockResolvedValue(new Response(JSON.stringify({
            total: 50, "200": 30, "402": 15, "404": 5,
        })));

        await fetchLogStats();
        expect(document.getElementById("logs-badge")!.style.display).toBe("inline-flex");
    });

    it("hides badge when total is 0", async () => {
        mockAuthFetch.mockResolvedValue(new Response(JSON.stringify({
            total: 0, "200": 0, "402": 0, "404": 0,
        })));

        await fetchLogStats();
        expect(document.getElementById("logs-badge")!.style.display).toBe("none");
    });

    it("shows toast on error", async () => {
        mockAuthFetch.mockRejectedValue(new Error("Network"));
        await fetchLogStats();
        expect(mockToast).toHaveBeenCalledWith("Failed to load log stats", "error");
    });
});

describe("fetchLogs", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        state.logsCurrentPage = 0;
        state.logsTotalCount = 0;
        state.logsFilterStatus = null;
        state.logsFilterProject = "";
    });

    it("fetches and renders logs", async () => {
        mockAuthFetch.mockResolvedValue(new Response(JSON.stringify({
            total: 2,
            logs: [
                { created_at: "2024-01-01T00:00:00Z", project_name: "Test", status_code: 200, response_text: "OK", client_ip: "1.2.3.4" },
                { created_at: "2024-01-01T01:00:00Z", project_name: "Test2", status_code: 402, response_text: "Unpaid", client_ip: "5.6.7.8" },
            ],
        })));

        await fetchLogs();

        expect(state.logsTotalCount).toBe(2);
        const rows = document.getElementById("logs-body")!.querySelectorAll("tr");
        expect(rows.length).toBe(2);
    });

    it("includes filter params in URL", async () => {
        state.logsFilterStatus = 402;
        state.logsFilterProject = "MyApp";

        mockAuthFetch.mockResolvedValue(new Response(JSON.stringify({ total: 0, logs: [] })));
        await fetchLogs();

        expect(mockAuthFetch).toHaveBeenCalledWith(expect.stringContaining("status_code=402"));
        expect(mockAuthFetch).toHaveBeenCalledWith(expect.stringContaining("project_name=MyApp"));
    });
});

describe("filterLogs", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        state.logsFilterStatus = null;
        state.logsCurrentPage = 5;
        mockAuthFetch.mockResolvedValue(new Response(JSON.stringify({ total: 0, logs: [] })));
    });

    it("sets filter status and resets page", () => {
        filterLogs(200);
        expect(state.logsFilterStatus).toBe(200);
        expect(state.logsCurrentPage).toBe(0);
    });

    it("clears filter with null", () => {
        state.logsFilterStatus = 402;
        filterLogs(null);
        expect(state.logsFilterStatus).toBeNull();
    });
});

describe("logsPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthFetch.mockResolvedValue(new Response(JSON.stringify({ total: 0, logs: [] })));
    });

    it("advances page forward", () => {
        state.logsTotalCount = 100;
        state.logsCurrentPage = 0;
        logsPage(1);
        expect(state.logsCurrentPage).toBe(1);
    });

    it("does not go below 0", () => {
        state.logsTotalCount = 100;
        state.logsCurrentPage = 0;
        logsPage(-1);
        expect(state.logsCurrentPage).toBe(0);
    });
});

describe("toggleAutoRefresh", () => {
    afterEach(() => {
        if (state.autoRefreshInterval) {
            clearInterval(state.autoRefreshInterval);
            state.autoRefreshInterval = null;
        }
    });

    it("turns on auto-refresh", () => {
        toggleAutoRefresh();
        expect(state.autoRefreshInterval).not.toBeNull();
        expect((document.getElementById("auto-refresh-toggle") as HTMLInputElement).checked).toBe(true);
    });

    it("turns off auto-refresh", () => {
        toggleAutoRefresh();
        toggleAutoRefresh();
        expect(state.autoRefreshInterval).toBeNull();
        expect((document.getElementById("auto-refresh-toggle") as HTMLInputElement).checked).toBe(false);
    });
});

describe("exportCSV", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("shows error when no logs", () => {
        state.logsTotalCount = 0;
        exportCSV();
        expect(mockToast).toHaveBeenCalledWith("No logs to export", "error");
    });

    it("exports CSV on success", async () => {
        state.logsTotalCount = 1;
        const createObjectURL = vi.fn(() => "blob:test");
        const revokeObjectURL = vi.fn();
        globalThis.URL.createObjectURL = createObjectURL;
        globalThis.URL.revokeObjectURL = revokeObjectURL;

        mockAuthFetch.mockResolvedValue(new Response(JSON.stringify({
            logs: [{ created_at: "2024-01-01T00:00:00Z", project_name: "Test", status_code: 200, response_text: "OK", client_ip: "1.2.3.4" }],
        })));

        exportCSV();
        // Wait for the async chain
        await new Promise(r => setTimeout(r, 50));

        expect(mockToast).toHaveBeenCalledWith(expect.stringContaining("Exported"));
    });
});

describe("handleLogsSearchInput", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        state.logsFilterProject = "";
        state.logsCurrentPage = 3;
        mockAuthFetch.mockResolvedValue(new Response(JSON.stringify({ total: 0, logs: [] })));
    });

    it("sets filter project and resets page", () => {
        const input = document.getElementById("logs-search-input") as HTMLInputElement;
        input.value = "MyApp";
        handleLogsSearchInput({ target: input } as unknown as Event);
        expect(state.logsFilterProject).toBe("MyApp");
        expect(state.logsCurrentPage).toBe(0);
    });

    it("updates info label with project name", () => {
        const input = document.getElementById("logs-search-input") as HTMLInputElement;
        input.value = "TestProject";
        handleLogsSearchInput({ target: input } as unknown as Event);
        const info = document.getElementById("logs-filter-info")!;
        expect(info.innerHTML).toContain("TestProject");
        expect(info.innerHTML).toContain("Filtered");
    });

    it("shows default label when input is empty", () => {
        const input = document.getElementById("logs-search-input") as HTMLInputElement;
        input.value = "";
        handleLogsSearchInput({ target: input } as unknown as Event);
        const info = document.getElementById("logs-filter-info")!;
        expect(info.innerHTML).toContain("Your projects + 404 responses");
        expect(info.innerHTML).toContain("check-circle");
    });
});
