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
import {
    openGlobalMsgEditor,
    closeGlobalMsgEditor,
    loadGlobalMessages,
    saveGlobalMessage,
    openProjectMsgEditor,
    closeProjectMsgEditor,
    loadProjectMessages,
    saveProjectMessage,
    removeProjectMessage,
} from "@/sections/messages";

const mockAuthFetch = vi.mocked(authFetch);
const mockApiCall = vi.mocked(apiCall);
const mockToast = vi.mocked(toast);

describe("global message editor", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("openGlobalMsgEditor adds show class", () => {
        mockAuthFetch.mockResolvedValue(new Response(JSON.stringify({ messages: [] })));
        openGlobalMsgEditor();
        expect(document.getElementById("me-global-overlay")!.classList.contains("show")).toBe(true);
    });

    it("closeGlobalMsgEditor removes show class", () => {
        openGlobalMsgEditor();
        closeGlobalMsgEditor();
        expect(document.getElementById("me-global-overlay")!.classList.contains("show")).toBe(false);
    });

    it("loadGlobalMessages renders message items", async () => {
        mockAuthFetch.mockResolvedValue(new Response(JSON.stringify({
            messages: [
                { status: "OK", message: "Payment verified" },
                { status: "UNPAID", message: "Payment required" },
            ],
        })));

        await loadGlobalMessages();
        const list = document.getElementById("me-global-list")!;
        expect(list.innerHTML).toContain("Payment verified");
        expect(list.innerHTML).toContain("UNPAID");
    });

    it("saveGlobalMessage calls apiCall", async () => {
        mockAuthFetch.mockResolvedValue(new Response(JSON.stringify({
            messages: [{ status: "OK", message: "Test" }],
        })));
        await loadGlobalMessages();

        mockApiCall.mockResolvedValue(new Response("{}", { status: 200 }));
        const textarea = document.getElementById("gmsg-OK") as HTMLTextAreaElement;
        textarea.value = "Updated message";

        await saveGlobalMessage("OK");
        expect(mockApiCall).toHaveBeenCalledWith(
            "/api/status-messages/OK",
            expect.objectContaining({ method: "PUT" }),
        );
    });

    it("saveGlobalMessage shows error for empty message", async () => {
        mockAuthFetch.mockResolvedValue(new Response(JSON.stringify({
            messages: [{ status: "OK", message: "" }],
        })));
        await loadGlobalMessages();

        const textarea = document.getElementById("gmsg-OK") as HTMLTextAreaElement;
        textarea.value = "   ";

        await saveGlobalMessage("OK");
        expect(mockToast).toHaveBeenCalledWith("Message cannot be empty", "error");
    });
});

describe("project message editor", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        state.pmsgProjectId = null;
    });

    it("openProjectMsgEditor sets project id and opens overlay", () => {
        mockAuthFetch.mockResolvedValue(new Response(JSON.stringify({ messages: [] })));
        openProjectMsgEditor(5, "TestProject");
        expect(state.pmsgProjectId).toBe(5);
        expect(document.getElementById("pmsg-project-name")!.textContent).toBe("TestProject");
        expect(document.getElementById("me-project-overlay")!.classList.contains("show")).toBe(true);
    });

    it("closeProjectMsgEditor clears state", () => {
        state.pmsgProjectId = 5;
        closeProjectMsgEditor();
        expect(state.pmsgProjectId).toBeNull();
        expect(document.getElementById("me-project-overlay")!.classList.contains("show")).toBe(false);
    });

    it("loadProjectMessages renders custom badges", async () => {
        state.pmsgProjectId = 1;
        mockAuthFetch.mockResolvedValue(new Response(JSON.stringify({
            messages: [
                { status: "OK", message: "Custom OK", is_custom: true },
                { status: "UNPAID", message: "Default unpaid", is_custom: false },
            ],
        })));

        await loadProjectMessages();
        const list = document.getElementById("me-project-list")!;
        expect(list.innerHTML).toContain("Custom");
        expect(list.innerHTML).toContain("Default");
    });

    it("saveProjectMessage calls correct API", async () => {
        state.pmsgProjectId = 3;
        mockAuthFetch.mockResolvedValue(new Response(JSON.stringify({
            messages: [{ status: "UNPAID", message: "Pay now", is_custom: false }],
        })));
        await loadProjectMessages();

        mockApiCall.mockResolvedValue(new Response("{}", { status: 200 }));
        const textarea = document.getElementById("pmsg-UNPAID") as HTMLTextAreaElement;
        textarea.value = "Updated";

        await saveProjectMessage("UNPAID");
        expect(mockApiCall).toHaveBeenCalledWith(
            "/api/projects/3/messages/UNPAID",
            expect.objectContaining({ method: "PUT" }),
        );
    });

    it("removeProjectMessage calls DELETE", async () => {
        state.pmsgProjectId = 3;
        mockApiCall.mockResolvedValue(new Response("{}", { status: 200 }));

        await removeProjectMessage("OK");
        expect(mockApiCall).toHaveBeenCalledWith(
            "/api/projects/3/messages/OK",
            expect.objectContaining({ method: "DELETE" }),
        );
    });
});
