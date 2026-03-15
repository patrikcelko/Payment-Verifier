import { describe, it, expect, vi, beforeEach } from "vitest";
import { getToken, setToken, clearToken, isAuthenticated, authFetch, apiCall, toast } from "@/core/api";

describe("token helpers", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("setToken / getToken round-trips", () => {
        setToken("abc123");
        expect(getToken()).toBe("abc123");
    });

    it("clearToken removes the token", () => {
        setToken("abc123");
        clearToken();
        expect(getToken()).toBeNull();
    });

    it("isAuthenticated returns true when token exists", () => {
        setToken("tok");
        expect(isAuthenticated()).toBe(true);
    });

    it("isAuthenticated returns false when no token", () => {
        expect(isAuthenticated()).toBe(false);
    });
});

describe("authFetch", () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it("adds Authorization header", async () => {
        setToken("test-token");
        vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));

        await authFetch("/api/test");

        expect(fetch).toHaveBeenCalledWith("/api/test", expect.objectContaining({
            headers: expect.any(Headers),
        }));

        const call = vi.mocked(fetch).mock.calls[0];
        const headers = call[1]!.headers as Headers;
        expect(headers.get("Authorization")).toBe("Bearer test-token");
    });

    it("throws on 401 and clears token", async () => {
        setToken("expired");
        vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 401 }));

        await expect(authFetch("/api/test")).rejects.toThrow("Authentication failed");
        expect(getToken()).toBeNull();
    });

    it("throws when not authenticated", async () => {
        await expect(authFetch("/api/test")).rejects.toThrow("Not authenticated");
    });
});

describe("apiCall", () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it("returns response on success", async () => {
        setToken("tok");
        vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response('{"ok":true}', { status: 200 }));

        const r = await apiCall("/api/test");
        expect(r.ok).toBe(true);
    });

    it("throws on non-ok response with detail", async () => {
        setToken("tok");
        vi.spyOn(globalThis, "fetch").mockResolvedValue(
            new Response('{"detail":"Not found"}', { status: 404 }),
        );

        await expect(apiCall("/api/test")).rejects.toThrow("Not found");
    });
});

describe("toast", () => {
    it("creates a toast element", () => {
        toast("Hello");
        const toasts = document.getElementById("toasts")!;
        const el = toasts.querySelector(".toast");
        expect(el).not.toBeNull();
        expect(el!.textContent).toBe("Hello");
        expect(el!.classList.contains("toast-success")).toBe(true);
    });

    it("creates error toast", () => {
        toast("Error!", "error");
        const toasts = document.getElementById("toasts")!;
        const el = toasts.querySelector(".toast-error");
        expect(el).not.toBeNull();
    });
});
