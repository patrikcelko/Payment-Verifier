/**
 * Tests Auth
 * ==========
 *
 * Covers switchAuthTab, showAuthModal, logout, toggleUserMenu, closeUserMenu,
 * openProfileModal, closeProfileModal, password strength callbacks, and initApp.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
    switchAuthTab,
    showAuthModal,
    logout,
    toggleUserMenu,
    closeUserMenu,
    openProfileModal,
    closeProfileModal,
    checkPasswordStrength,
    checkPasswordMatch,
    checkRegisterPasswordStrength,
    checkRegisterPasswordMatch,
    initApp,
} from "@/core/auth";
import { setToken, clearToken } from "@/core/api";
import { state } from "@/state";

describe("switchAuthTab", () => {
    beforeEach(() => {
        const overlay = document.getElementById("auth-overlay")!;
        overlay.style.display = "flex";
        overlay.classList.add("active");
        document.querySelectorAll(".auth-tab").forEach((btn, i) => {
            btn.classList.toggle("active", i === 0);
        });
        const login = document.getElementById("auth-tab-login") as HTMLElement;
        const register = document.getElementById("auth-tab-register") as HTMLElement;
        login.classList.add("active");
        login.style.display = "block";
        register.classList.remove("active");
        register.style.display = "none";
    });

    it("switches to register tab", () => {
        switchAuthTab("register");
        expect(document.getElementById("auth-tab-register")!.classList.contains("active")).toBe(true);
        expect((document.getElementById("auth-tab-register") as HTMLElement).style.display).toBe("block");
        expect(document.getElementById("auth-tab-login")!.classList.contains("active")).toBe(false);
        expect((document.getElementById("auth-tab-login") as HTMLElement).style.display).toBe("none");
    });

    it("switches back to login tab", () => {
        switchAuthTab("register");
        switchAuthTab("login");
        expect(document.getElementById("auth-tab-login")!.classList.contains("active")).toBe(true);
        expect(document.getElementById("auth-tab-register")!.classList.contains("active")).toBe(false);
    });

    it("activates correct tab button", () => {
        switchAuthTab("register");
        const buttons = document.querySelectorAll(".auth-tab");
        expect(buttons[0].classList.contains("active")).toBe(false);
        expect(buttons[1].classList.contains("active")).toBe(true);
    });
});

describe("showAuthModal", () => {
    it("shows auth overlay and hides app wrap", () => {
        const overlay = document.getElementById("auth-overlay") as HTMLElement;
        const appWrap = document.getElementById("app-wrap") as HTMLElement;
        overlay.style.display = "none";
        overlay.classList.remove("active");
        appWrap.style.display = "flex";

        showAuthModal();

        expect(overlay.style.display).toBe("flex");
        expect(overlay.classList.contains("active")).toBe(true);
        expect(appWrap.style.display).toBe("none");
    });

    it("switches to login tab", () => {
        showAuthModal();
        expect(document.getElementById("auth-tab-login")!.classList.contains("active")).toBe(true);
    });
});

describe("logout", () => {
    beforeEach(() => {
        setToken("test-token");
        state.allProjects = [{ id: 1 } as any];
        document.getElementById("app-wrap")!.style.display = "flex";
    });

    it("clears state and shows auth overlay", () => {
        logout();
        const overlay = document.getElementById("auth-overlay")!;
        expect(overlay.style.display).toBe("flex");
        expect(overlay.classList.contains("active")).toBe(true);
        expect(document.getElementById("app-wrap")!.style.display).toBe("none");
        expect(state.allProjects).toEqual([]);
    });

    it("accepts optional event parameter", () => {
        const event = { preventDefault: vi.fn() } as unknown as Event;
        logout(event);
        expect(event.preventDefault).toHaveBeenCalled();
    });
});

describe("toggleUserMenu", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        document.getElementById("user-dropdown")!.classList.remove("open");
        document.querySelector(".top-bar-user")!.classList.remove("open");
    });

    afterEach(() => {
        closeUserMenu();
        vi.runAllTimers();
        vi.useRealTimers();
    });

    it("opens user dropdown on first call", () => {
        const trigger = document.getElementById("top-bar-user")!;
        const event = { stopPropagation: vi.fn(), currentTarget: trigger } as unknown as Event;

        toggleUserMenu(event);

        expect(document.getElementById("user-dropdown")!.classList.contains("open")).toBe(true);
        expect(trigger.classList.contains("open")).toBe(true);
    });

    it("closes user dropdown on second call", () => {
        const trigger = document.getElementById("top-bar-user")!;
        const dropdown = document.getElementById("user-dropdown")!;

        const event1 = { stopPropagation: vi.fn(), currentTarget: trigger } as unknown as Event;
        toggleUserMenu(event1);
        expect(dropdown.classList.contains("open")).toBe(true);

        vi.runAllTimers();

        const event2 = { stopPropagation: vi.fn(), currentTarget: trigger } as unknown as Event;
        toggleUserMenu(event2);

        expect(dropdown.classList.contains("open")).toBe(false);
        expect(trigger.classList.contains("open")).toBe(false);
    });
});

describe("closeUserMenu", () => {
    it("removes open class from dropdown and trigger", () => {
        document.getElementById("user-dropdown")!.classList.add("open");
        document.querySelector(".top-bar-user")!.classList.add("open");

        closeUserMenu();

        expect(document.getElementById("user-dropdown")!.classList.contains("open")).toBe(false);
        expect(document.querySelector(".top-bar-user")!.classList.contains("open")).toBe(false);
    });
});

describe("openProfileModal", () => {
    beforeEach(() => {
        setToken("test-token");
        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ name: "Test User", email: "test@test.com" }),
        } as Response);
    });

    it("shows profile overlay", () => {
        const event = { preventDefault: vi.fn() } as unknown as Event;
        openProfileModal(event);

        const overlay = document.getElementById("profile-overlay")!;
        expect(overlay.style.display).toBe("flex");
        expect(overlay.classList.contains("show")).toBe(true);
    });

    it("clears password fields", () => {
        const event = { preventDefault: vi.fn() } as unknown as Event;
        openProfileModal(event);

        expect((document.getElementById("profile-current-password") as HTMLInputElement).value).toBe("");
        expect((document.getElementById("profile-new-password") as HTMLInputElement).value).toBe("");
        expect((document.getElementById("profile-confirm-password") as HTMLInputElement).value).toBe("");
    });

    it("hides password strength and match error", () => {
        const event = { preventDefault: vi.fn() } as unknown as Event;
        openProfileModal(event);

        expect(document.getElementById("password-strength")!.style.display).toBe("none");
        expect(document.getElementById("password-match-error")!.style.display).toBe("none");
    });

    it("closes user menu", () => {
        document.getElementById("user-dropdown")!.classList.add("open");
        const event = { preventDefault: vi.fn() } as unknown as Event;
        openProfileModal(event);

        expect(document.getElementById("user-dropdown")!.classList.contains("open")).toBe(false);
    });
});

describe("closeProfileModal", () => {
    it("hides profile overlay", () => {
        const overlay = document.getElementById("profile-overlay")!;
        overlay.style.display = "flex";
        overlay.classList.add("show");

        closeProfileModal();

        expect(overlay.style.display).toBe("none");
        expect(overlay.classList.contains("show")).toBe(false);
    });
});

describe("checkPasswordStrength", () => {
    it("updates requirement classes for strong password", () => {
        (document.getElementById("profile-new-password") as HTMLInputElement).value = "StrongPass1";
        (document.getElementById("profile-confirm-password") as HTMLInputElement).value = "";

        checkPasswordStrength();

        expect(document.getElementById("req-length")!.className).toBe("met");
        expect(document.getElementById("req-uppercase")!.className).toBe("met");
        expect(document.getElementById("req-lowercase")!.className).toBe("met");
        expect(document.getElementById("req-number")!.className).toBe("met");
    });

    it("marks unmet requirements for weak password", () => {
        (document.getElementById("profile-new-password") as HTMLInputElement).value = "abc";
        (document.getElementById("profile-confirm-password") as HTMLInputElement).value = "";

        checkPasswordStrength();

        expect(document.getElementById("req-length")!.className).toBe("unmet");
        expect(document.getElementById("req-uppercase")!.className).toBe("unmet");
        expect(document.getElementById("req-number")!.className).toBe("unmet");
        expect(document.getElementById("req-lowercase")!.className).toBe("met");
    });
});

describe("checkPasswordMatch", () => {
    it("shows error when passwords do not match", () => {
        (document.getElementById("profile-new-password") as HTMLInputElement).value = "Pass1234";
        (document.getElementById("profile-confirm-password") as HTMLInputElement).value = "Different1";

        checkPasswordMatch();

        expect(document.getElementById("password-match-error")!.style.display).toBe("block");
    });

    it("hides error when passwords match", () => {
        (document.getElementById("profile-new-password") as HTMLInputElement).value = "Pass1234";
        (document.getElementById("profile-confirm-password") as HTMLInputElement).value = "Pass1234";

        checkPasswordMatch();

        expect(document.getElementById("password-match-error")!.style.display).toBe("none");
    });
});

describe("checkRegisterPasswordStrength", () => {
    it("updates register requirement classes", () => {
        (document.getElementById("register-password") as HTMLInputElement).value = "GoodPass1";
        (document.getElementById("register-password-confirm") as HTMLInputElement).value = "";

        checkRegisterPasswordStrength();

        expect(document.getElementById("register-req-length")!.className).toBe("met");
        expect(document.getElementById("register-req-uppercase")!.className).toBe("met");
        expect(document.getElementById("register-req-lowercase")!.className).toBe("met");
        expect(document.getElementById("register-req-number")!.className).toBe("met");
    });
});

describe("checkRegisterPasswordMatch", () => {
    it("shows error when register passwords do not match", () => {
        (document.getElementById("register-password") as HTMLInputElement).value = "Pass1234";
        (document.getElementById("register-password-confirm") as HTMLInputElement).value = "Other123";

        checkRegisterPasswordMatch();

        expect(document.getElementById("register-password-match-error")!.style.display).toBe("block");
    });

    it("hides error when register passwords match", () => {
        (document.getElementById("register-password") as HTMLInputElement).value = "Pass1234";
        (document.getElementById("register-password-confirm") as HTMLInputElement).value = "Pass1234";

        checkRegisterPasswordMatch();

        expect(document.getElementById("register-password-match-error")!.style.display).toBe("none");
    });
});

describe("initApp", () => {
    it("shows auth overlay when not authenticated", () => {
        clearToken();

        initApp();

        const overlay = document.getElementById("auth-overlay")!;
        expect(overlay.style.display).toBe("flex");
        expect(overlay.classList.contains("active")).toBe(true);
        expect(document.getElementById("app-wrap")!.style.display).toBe("none");
    });

    it("shows app wrap when authenticated", () => {
        setToken("test-token");
        vi.spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ name: "Test", email: "t@t.com" }),
        } as Response);

        initApp();

        expect(document.getElementById("app-wrap")!.style.display).toBe("flex");
        const overlay = document.getElementById("auth-overlay")!;
        expect(overlay.style.display).toBe("none");
        expect(overlay.classList.contains("active")).toBe(false);
    });
});
