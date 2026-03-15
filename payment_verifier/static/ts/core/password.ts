const PASSWORD_PATTERNS = {
    length: /.{8,}/,
    uppercase: /[A-Z]/,
    lowercase: /[a-z]/,
    digit: /[0-9]/,
};

export interface PasswordValidation {
    hasLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    isValid: () => boolean;
    strength: () => number;
}

export function validatePasswordStrength(password: string): PasswordValidation {
    return {
        hasLength: PASSWORD_PATTERNS.length.test(password),
        hasUppercase: PASSWORD_PATTERNS.uppercase.test(password),
        hasLowercase: PASSWORD_PATTERNS.lowercase.test(password),
        hasNumber: PASSWORD_PATTERNS.digit.test(password),
        isValid: () => (
            PASSWORD_PATTERNS.length.test(password) &&
            PASSWORD_PATTERNS.uppercase.test(password) &&
            PASSWORD_PATTERNS.lowercase.test(password) &&
            PASSWORD_PATTERNS.digit.test(password)
        ),
        strength: () => {
            const checks = [
                PASSWORD_PATTERNS.length.test(password),
                PASSWORD_PATTERNS.uppercase.test(password),
                PASSWORD_PATTERNS.lowercase.test(password),
                PASSWORD_PATTERNS.digit.test(password),
            ];
            return checks.filter(Boolean).length;
        },
    };
}

interface StrengthInfo {
    text: string;
    color: string;
    class: string;
}

export function getStrengthInfo(strength: number): StrengthInfo {
    const info: Record<number, StrengthInfo> = {
        1: { text: "Weak password", color: "var(--unpaid)", class: "weak" },
        2: { text: "Fair password", color: "var(--overdue)", class: "fair" },
        3: { text: "Good password", color: "var(--partial)", class: "good" },
        4: { text: "Strong password", color: "var(--ok)", class: "strong" },
    };
    return info[strength] || info[1];
}

export function updateStrengthIndicator(fieldId: string, textId: string, numBars: number, strength: number): void {
    const field = document.getElementById(fieldId);
    const text = document.getElementById(textId);

    if (!field || !text) return;

    if (strength === 0) {
        field.style.display = "none";
        return;
    }

    field.style.display = "block";

    for (let i = 1; i <= numBars; i++) {
        const barId = textId.replace("-text", "") + `-bar-${i}`;
        const bar = document.getElementById(barId);
        if (bar) bar.className = "strength-bar";
    }

    const info = getStrengthInfo(strength);
    for (let i = 1; i <= strength; i++) {
        const barId = textId.replace("-text", "") + `-bar-${i}`;
        const bar = document.getElementById(barId);
        if (bar) bar.className = `strength-bar ${info.class}`;
    }

    text.textContent = info.text;
    text.style.color = info.color;
}

export function passwordsMatch(password1: string, password2: string): boolean {
    return password1 === password2 && password1 !== "";
}

export function updatePasswordMatchError(errorId: string, password1: string, password2: string): void {
    const errorDiv = document.getElementById(errorId);
    if (!errorDiv) return;

    if (!password2 || !password1) {
        errorDiv.style.display = "none";
        return;
    }

    errorDiv.style.display = password1 !== password2 ? "block" : "none";
}
