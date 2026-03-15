import { describe, it, expect, vi, beforeEach } from "vitest";
import { state } from "@/state";

vi.mock("@/core/api", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/core/api")>();
    return {
        ...actual,
        authFetch: vi.fn(),
        apiCall: vi.fn(),
        toast: vi.fn(),
    };
});

vi.mock("@/core/ui", () => ({
    confirmPopup: vi.fn().mockResolvedValue(true),
    toast: vi.fn(),
}));

import { authFetch, apiCall, toast } from "@/core/api";
import { fetchProjects, render, openCreateModal, openEditModal, closeProjectModal, submitModal, toggleSelector, selectStatus, quickVerify, deleteProject, copyVerifyUrl } from "@/sections/projects";

const mockAuthFetch = vi.mocked(authFetch);
const mockApiCall = vi.mocked(apiCall);
const mockToast = vi.mocked(toast);

const sampleProject = {
    id: 1,
    name: "TestProject",
    status: "OK",
    api_token: "tok-123",
    customer_name: "Acme Corp",
    customer_address: "123 Main St",
    project_url: "https://example.com",
    contact_person: "John",
    contact_email: "john@acme.com",
    contact_phone: "+1234567890",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
    last_queried_at: null,
};

describe("fetchProjects", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        state.allProjects = [];
    });

    it("populates state and renders", async () => {
        mockAuthFetch.mockResolvedValue(new Response(JSON.stringify({
            projects: [sampleProject],
        })));

        await fetchProjects();
        expect(state.allProjects).toHaveLength(1);
        expect(state.allProjects[0].name).toBe("TestProject");
    });

    it("shows toast on error", async () => {
        mockAuthFetch.mockRejectedValue(new Error("Network"));
        await fetchProjects();
        expect(mockToast).toHaveBeenCalledWith("Failed to load projects", "error");
    });
});

describe("render", () => {
    beforeEach(() => {
        state.allProjects = [sampleProject];
        (document.getElementById("search-input") as HTMLInputElement).value = "";
    });

    it("renders project cards", () => {
        render();
        const grid = document.getElementById("projects-grid")!;
        expect(grid.innerHTML).toContain("TestProject");
        expect(grid.innerHTML).toContain("Acme Corp");
        expect(grid.style.display).toBe("grid");
    });

    it("updates counters", () => {
        render();
        expect(document.getElementById("total-count")!.textContent).toBe("1");
        expect(document.getElementById("ok-count")!.textContent).toBe("1");
        expect(document.getElementById("blocked-count")!.textContent).toBe("0");
        expect(document.getElementById("count")!.textContent).toBe("1");
    });

    it("filters by search input", () => {
        (document.getElementById("search-input") as HTMLInputElement).value = "nonexistent";
        render();
        expect(document.getElementById("empty-search")!.style.display).toBe("block");
    });

    it("shows empty state for no projects", () => {
        state.allProjects = [];
        render();
        expect(document.getElementById("empty-state")!.style.display).toBe("block");
        expect(document.getElementById("projects-grid")!.style.display).toBe("none");
    });

    it("includes verification URL with token", () => {
        render();
        const grid = document.getElementById("projects-grid")!;
        expect(grid.innerHTML).toContain("tok-123");
    });
});

describe("openCreateModal", () => {
    it("shows modal with create title", () => {
        openCreateModal();
        expect(document.getElementById("modal-title")!.textContent).toBe("Add Project");
        expect(document.getElementById("modal-submit")!.textContent).toBe("Create");
        expect(document.getElementById("modal-overlay")!.classList.contains("show")).toBe(true);
    });
});

describe("openEditModal", () => {
    beforeEach(() => {
        state.allProjects = [sampleProject];
    });

    it("populates fields for editing", () => {
        openEditModal(1);
        expect(document.getElementById("modal-title")!.textContent).toBe("Edit - TestProject");
        expect((document.getElementById("modal-customer-name") as HTMLInputElement).value).toBe("Acme Corp");
        expect(document.getElementById("modal-name-group")!.style.display).toBe("none");
    });

    it("does nothing for unknown id", () => {
        document.getElementById("modal-overlay")!.classList.remove("show");
        openEditModal(999);
        expect(document.getElementById("modal-overlay")!.classList.contains("show")).toBe(false);
    });
});

describe("closeProjectModal", () => {
    it("removes show class", () => {
        openCreateModal();
        closeProjectModal();
        expect(document.getElementById("modal-overlay")!.classList.contains("show")).toBe(false);
    });
});

describe("submitModal", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        state.allProjects = [sampleProject];
        mockApiCall.mockResolvedValue(new Response("{}", { status: 200 }));
        mockAuthFetch.mockResolvedValue(new Response(JSON.stringify({ projects: [sampleProject] })));
    });

    it("creates new project", async () => {
        openCreateModal();
        (document.getElementById("modal-name") as HTMLInputElement).value = "NewProject";
        (document.getElementById("modal-status") as HTMLSelectElement).value = "OK";

        await submitModal();
        expect(mockApiCall).toHaveBeenCalledWith(
            "/api/projects",
            expect.objectContaining({ method: "POST" }),
        );
    });

    it("shows error for empty name", async () => {
        openCreateModal();
        (document.getElementById("modal-name") as HTMLInputElement).value = "";

        await submitModal();
        expect(mockToast).toHaveBeenCalledWith("Name is required", "error");
    });

    it("updates existing project", async () => {
        openEditModal(1);
        await submitModal();
        expect(mockApiCall).toHaveBeenCalledWith(
            "/api/projects/1",
            expect.objectContaining({ method: "PATCH" }),
        );
    });
});

describe("toggleSelector", () => {
    it("toggles open class on selector", () => {
        render();
        const trigger = document.querySelector(".ss-trigger") as HTMLElement;
        toggleSelector(trigger);
        expect(trigger.closest(".status-selector")!.classList.contains("open")).toBe(true);
    });
});

describe("selectStatus", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        state.allProjects = [sampleProject];
        mockApiCall.mockResolvedValue(new Response("{}", { status: 200 }));
        mockAuthFetch.mockResolvedValue(new Response(JSON.stringify({ projects: [sampleProject] })));
    });

    it("closes the selector and calls updateStatus", async () => {
        render();
        const opt = document.querySelector(".ss-opt") as HTMLElement;
        const sel = opt.closest(".status-selector") as HTMLElement;
        sel.classList.add("open");

        await selectStatus(1, "UNPAID", opt);
        expect(sel.classList.contains("open")).toBe(false);
        expect(mockApiCall).toHaveBeenCalled();
    });
});

describe("quickVerify", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        state.allProjects = [sampleProject];
        mockAuthFetch.mockResolvedValue(new Response(JSON.stringify({ projects: [sampleProject] })));
    });

    it("shows toast for 200 response", async () => {
        render();
        vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("OK", { status: 200 }));
        const btn = document.querySelector(".project-card .btn.btn-sm") as HTMLElement;
        await quickVerify("TestProject", btn);
        expect(mockToast).toHaveBeenCalledWith("TestProject: OK");
    });

    it("shows error toast for 402 response", async () => {
        render();
        vi.spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(JSON.stringify({ status: "UNPAID", message: "Payment required" }), { status: 402 }),
        );
        const btn = document.querySelector(".project-card .btn.btn-sm") as HTMLElement;
        await quickVerify("TestProject", btn);
        expect(mockToast).toHaveBeenCalledWith("TestProject: Payment required", "error");
    });
});

describe("deleteProject", () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        state.allProjects = [sampleProject];
        mockApiCall.mockResolvedValue(new Response("{}", { status: 200 }));
        mockAuthFetch.mockResolvedValue(new Response(JSON.stringify({ projects: [] })));
        const { confirmPopup } = await import("@/core/ui");
        vi.mocked(confirmPopup).mockResolvedValue(true);
    });

    it("calls DELETE API", async () => {
        await deleteProject(1, "TestProject");
        expect(mockApiCall).toHaveBeenCalledWith(
            "/api/projects/1",
            expect.objectContaining({ method: "DELETE" }),
        );
    });
});

describe("copyVerifyUrl", () => {
    it("copies URL to clipboard", () => {
        const mockWrite = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, { clipboard: { writeText: mockWrite } });
        copyVerifyUrl("https://example.com/?token=abc");
        expect(mockWrite).toHaveBeenCalledWith("https://example.com/?token=abc");
    });
});
