import { describe, it, expect } from "vitest";
import { validatePasswordStrength, getStrengthInfo, passwordsMatch, updatePasswordMatchError } from "@/core/password";

describe("validatePasswordStrength", () => {
    it("reports valid for a strong password", () => {
        const v = validatePasswordStrength("StrongP4ss");
        expect(v.isValid()).toBe(true);
        expect(v.hasLength).toBe(true);
        expect(v.hasUppercase).toBe(true);
        expect(v.hasLowercase).toBe(true);
        expect(v.hasNumber).toBe(true);
        expect(v.strength()).toBe(4);
    });

    it("reports invalid for empty string", () => {
        const v = validatePasswordStrength("");
        expect(v.isValid()).toBe(false);
        expect(v.strength()).toBe(0);
    });

    it("reports invalid for too short password", () => {
        const v = validatePasswordStrength("Aa1");
        expect(v.isValid()).toBe(false);
        expect(v.hasLength).toBe(false);
    });

    it("reports missing uppercase", () => {
        const v = validatePasswordStrength("lowercase123");
        expect(v.hasUppercase).toBe(false);
        expect(v.isValid()).toBe(false);
    });

    it("reports missing lowercase", () => {
        const v = validatePasswordStrength("UPPERCASE123");
        expect(v.hasLowercase).toBe(false);
        expect(v.isValid()).toBe(false);
    });

    it("reports missing number", () => {
        const v = validatePasswordStrength("NoNumbers");
        expect(v.hasNumber).toBe(false);
        expect(v.isValid()).toBe(false);
    });

    it("calculates partial strength", () => {
        const v = validatePasswordStrength("longpassword");
        expect(v.hasLength).toBe(true);
        expect(v.hasLowercase).toBe(true);
        expect(v.hasUppercase).toBe(false);
        expect(v.hasNumber).toBe(false);
        expect(v.strength()).toBe(2);
    });
});

describe("getStrengthInfo", () => {
    it("returns 'Weak' for low strength", () => {
        const info = getStrengthInfo(1);
        expect(info.text).toBe("Weak password");
        expect(info.color).toBeDefined();
    });

    it("returns 'Fair' for medium strength", () => {
        const info = getStrengthInfo(2);
        expect(info.text).toBe("Fair password");
    });

    it("returns 'Good' for strength 3", () => {
        const info = getStrengthInfo(3);
        expect(info.text).toBe("Good password");
    });

    it("returns 'Strong' for max strength", () => {
        const info = getStrengthInfo(4);
        expect(info.text).toBe("Strong password");
    });
});

describe("passwordsMatch", () => {
    it("returns true for matching passwords", () => {
        expect(passwordsMatch("Password1", "Password1")).toBe(true);
    });

    it("returns false for different passwords", () => {
        expect(passwordsMatch("Password1", "Password2")).toBe(false);
    });

    it("returns false for both empty", () => {
        expect(passwordsMatch("", "")).toBe(false);
    });
});

describe("updatePasswordMatchError", () => {
    it("hides error when no confirm entered", () => {
        updatePasswordMatchError("password-match-error", "abc", "");
        expect(document.getElementById("password-match-error")!.style.display).toBe("none");
    });

    it("shows error when passwords differ", () => {
        updatePasswordMatchError("password-match-error", "Password1", "Password2");
        expect(document.getElementById("password-match-error")!.style.display).toBe("block");
    });

    it("hides error when passwords match", () => {
        updatePasswordMatchError("password-match-error", "Password1", "Password1");
        expect(document.getElementById("password-match-error")!.style.display).toBe("none");
    });
});
