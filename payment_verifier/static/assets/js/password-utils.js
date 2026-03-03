// Password requirements regex patterns
const PASSWORD_PATTERNS = {
    length: /.{8,}/,
    uppercase: /[A-Z]/,
    lowercase: /[a-z]/,
    digit: /[0-9]/,
};

/**
 * Validate password meets all strength requirements
 */
function validatePasswordStrength(password) {
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

/**
 * Get password strength level and color
 */
function getStrengthInfo(strength) {
    const info = {
        1: { text: "Weak password", color: "var(--unpaid)", class: "weak" },
        2: { text: "Fair password", color: "var(--overdue)", class: "fair" },
        3: { text: "Good password", color: "var(--partial)", class: "good" },
        4: { text: "Strong password", color: "var(--ok)", class: "strong" },
    };
    return info[strength] || info[1];
}

/**
 * Handle password strength indicator UI updates
 */
function updateStrengthIndicator(fieldId, textId, numBars, strength) {
    const field = document.getElementById(fieldId);
    const text = document.getElementById(textId);

    if (!field || !text) return;

    if (strength === 0) {
        field.style.display = "none";
        return;
    }

    field.style.display = "block";

    // Clear all bars
    for (let i = 1; i <= numBars; i++) {
        const barId = textId.replace("-text", "") + `-bar-${i}`;
        const bar = document.getElementById(barId);
        if (bar) bar.className = "strength-bar";
    }

    // Set strength bars and text
    const info = getStrengthInfo(strength);
    for (let i = 1; i <= strength; i++) {
        const barId = textId.replace("-text", "") + `-bar-${i}`;
        const bar = document.getElementById(barId);
        if (bar) bar.className = `strength-bar ${info.class}`;
    }

    text.textContent = info.text;
    text.style.color = info.color;
}

/**
 * Check if two passwords match
 */
function passwordsMatch(password1, password2) {
    return password1 === password2 && password1 !== "";
}

/**
 * Display password match error
 */
function updatePasswordMatchError(errorId, password1, password2) {
    const errorDiv = document.getElementById(errorId);
    if (!errorDiv) return;

    if (!password2 || !password1) {
        errorDiv.style.display = "none";
        return;
    }

    if (password1 !== password2) {
        errorDiv.style.display = "block";
    } else {
        errorDiv.style.display = "none";
    }
}
