import { describe, it, expect, vi } from "vitest";
import { escHtml, icon, formatDate, relativeTime, copyToClipboard } from "@/core/utils";

describe("escHtml", () => {
    it("escapes HTML special characters", () => {
        expect(escHtml("<script>alert('xss')</script>")).toBe(
            "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;",
        );
    });

    it("escapes ampersands and quotes", () => {
        expect(escHtml('a & "b"')).toBe('a &amp; &quot;b&quot;');
    });

    it("returns empty string for empty input", () => {
        expect(escHtml("")).toBe("");
    });

    it("passes through safe text", () => {
        expect(escHtml("Hello World")).toBe("Hello World");
    });
});

describe("icon", () => {
    it("returns an img tag with the correct src", () => {
        const result = icon("user");
        expect(result).toContain('src="/static/assets/icons/user.svg"');
        expect(result).toContain('class="svg-icon"');
        expect(result).toContain('width="13"');
        expect(result).toContain('height="13"');
    });

    it("applies custom dimensions", () => {
        const result = icon("check", 20, 20);
        expect(result).toContain('width="20"');
        expect(result).toContain('height="20"');
    });

    it("adds extra class", () => {
        const result = icon("edit", 13, 13, "my-class");
        expect(result).toContain('class="svg-icon my-class"');
    });
});

describe("formatDate", () => {
    it("returns dash for null/undefined", () => {
        expect(formatDate(null)).toBe("—");
        expect(formatDate("")).toBe("—");
    });

    it("formats ISO date", () => {
        const result = formatDate("2024-03-15T14:30:00Z");
        expect(result).toMatch(/15 Mar 2024/);
    });
});

describe("relativeTime", () => {
    it("returns 'never' for null", () => {
        expect(relativeTime(null)).toBe("never");
    });

    it("returns 'just now' for recent times", () => {
        const now = new Date().toISOString();
        expect(relativeTime(now)).toBe("just now");
    });

    it("returns seconds for < 60s", () => {
        const d = new Date(Date.now() - 30 * 1000).toISOString();
        expect(relativeTime(d)).toBe("30s ago");
    });

    it("returns minutes for < 60m", () => {
        const d = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        expect(relativeTime(d)).toBe("5m ago");
    });

    it("returns hours for < 24h", () => {
        const d = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
        expect(relativeTime(d)).toMatch(/3h 0m ago/);
    });

    it("returns days for < 30d", () => {
        const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        expect(relativeTime(d)).toBe("7d ago");
    });

    it("falls back to formatDate for > 30d", () => {
        const d = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
        const result = relativeTime(d);
        expect(result).not.toMatch(/ago/);
        expect(result).toMatch(/\d{4}/);
    });
});

describe("copyToClipboard", () => {
    it("copies text using clipboard API", async () => {
        const mockWrite = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, { clipboard: { writeText: mockWrite } });
        const showToast = vi.fn();
        copyToClipboard("hello", showToast);
        expect(mockWrite).toHaveBeenCalledWith("hello");
        await new Promise(r => setTimeout(r, 10));
        expect(showToast).toHaveBeenCalledWith("Verification link copied to clipboard");
    });
});
