import { state } from "@/state";
import { authFetch, clearToken, setToken, isAuthenticated, toast, AUTH_API } from "@/core/api";
import { validatePasswordStrength, passwordsMatch, updateStrengthIndicator, updatePasswordMatchError } from "@/core/password";
import { fetchProjects } from "@/sections/projects";
import { fetchLogStats } from "@/sections/logs";

export function switchAuthTab(tab: "login" | "register"): void {
    const buttons = document.querySelectorAll(".auth-tab");
    const contents = document.querySelectorAll(".auth-tab-content");
    const index = tab === "login" ? 0 : 1;

    buttons.forEach((btn, i) => {
        btn.classList.toggle("active", i === index);
    });

    contents.forEach((content, i) => {
        const el = content as HTMLElement;
        el.classList.toggle("active", i === index);
        el.style.display = i === index ? "block" : "none";
    });

    const inputId = tab === "login" ? "login-email" : "register-email";
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (input) input.focus();
}

export function showAuthModal(): void {
    const authOverlay = document.getElementById("auth-overlay");
    const appWrap = document.getElementById("app-wrap");
    if (authOverlay) {
        authOverlay.classList.add("active");
        authOverlay.style.display = "flex";
    }
    switchAuthTab("login");
    if (appWrap) appWrap.style.display = "none";
}

async function login(email: string, password: string): Promise<void> {
    const r = await fetch(`${AUTH_API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });

    if (!r.ok) {
        const data = await r.json();
        throw new Error(data.detail || "Login failed");
    }

    const data = await r.json();
    setToken(data.access_token);
}

export async function handleLogin(e: Event): Promise<void> {
    e.preventDefault();
    const email = (document.getElementById("login-email") as HTMLInputElement).value.trim();
    const password = (document.getElementById("login-password") as HTMLInputElement).value;
    const btn = (e.target as HTMLFormElement).querySelector("button[type=submit]") as HTMLButtonElement;
    const error = document.getElementById("login-error") as HTMLElement;

    error.style.display = "none";
    btn.disabled = true;
    btn.textContent = "Logging in...";

    try {
        await login(email, password);
        const authOverlay = document.getElementById("auth-overlay")!;
        authOverlay.classList.remove("active");
        authOverlay.style.display = "none";
        document.getElementById("app-wrap")!.style.display = "flex";
        initApp();
    } catch (err) {
        error.textContent = (err as Error).message || "Login failed";
        error.style.display = "block";
    } finally {
        btn.disabled = false;
        btn.textContent = "Login";
    }
}

export async function handleRegister(e: Event): Promise<void> {
    e.preventDefault();
    const name = (document.getElementById("register-name") as HTMLInputElement).value.trim();
    const email = (document.getElementById("register-email") as HTMLInputElement).value.trim();
    const password = (document.getElementById("register-password") as HTMLInputElement).value;
    const passwordConfirm = (document.getElementById("register-password-confirm") as HTMLInputElement).value;
    const btn = (e.target as HTMLFormElement).querySelector("button[type=submit]") as HTMLButtonElement;
    const error = document.getElementById("register-error") as HTMLElement;

    error.style.display = "none";

    if (!passwordsMatch(password, passwordConfirm)) {
        error.textContent = "Passwords do not match";
        error.style.display = "block";
        return;
    }

    const validation = validatePasswordStrength(password);
    if (!validation.isValid()) {
        let msg = "Password must be at least 8 characters";
        if (!validation.hasUppercase) msg = "Password must contain at least one uppercase letter";
        if (!validation.hasLowercase) msg = "Password must contain at least one lowercase letter";
        if (!validation.hasNumber) msg = "Password must contain at least one number";
        error.textContent = msg;
        error.style.display = "block";
        return;
    }

    btn.disabled = true;
    btn.textContent = "Creating account...";

    try {
        const r = await fetch(`${AUTH_API}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
        });

        if (!r.ok) {
            const data = await r.json();
            throw new Error(data.detail || "Registration failed");
        }

        const data = await r.json();
        setToken(data.access_token);
        const authOverlay = document.getElementById("auth-overlay")!;
        authOverlay.classList.remove("active");
        authOverlay.style.display = "none";
        document.getElementById("app-wrap")!.style.display = "flex";
        initApp();
        toast("Account created successfully!");
    } catch (err) {
        error.textContent = (err as Error).message || "Registration failed";
        error.style.display = "block";
    } finally {
        btn.disabled = false;
        btn.textContent = "Create Account";
    }
}

export function logout(event?: Event): void {
    if (event) event.preventDefault();
    clearToken();
    state.allProjects = [];
    if (state.autoRefreshInterval) {
        clearInterval(state.autoRefreshInterval);
        state.autoRefreshInterval = null;
    }
    document.getElementById("app-wrap")!.style.display = "none";
    const authOverlay = document.getElementById("auth-overlay")!;
    authOverlay.classList.add("active");
    authOverlay.style.display = "flex";
    switchAuthTab("login");
    closeUserMenu();
}

function closeUserMenuOnClickOutside(event: MouseEvent): void {
    const menu = document.querySelector(".top-bar-user");
    if (menu && !menu.contains(event.target as Node)) {
        closeUserMenu();
    }
}

export function toggleUserMenu(event: Event): void {
    event.stopPropagation();
    const dropdown = document.getElementById("user-dropdown");
    const trigger = (event.currentTarget as HTMLElement).closest(".top-bar-user") as HTMLElement;

    if (!dropdown || !trigger) return;

    const isOpen = dropdown.classList.contains("open");

    if (isOpen) {
        closeUserMenu();
    } else {
        dropdown.classList.add("open");
        trigger.classList.add("open");
        setTimeout(() => {
            document.addEventListener("click", closeUserMenuOnClickOutside);
        }, 0);
    }
}

export function closeUserMenu(): void {
    const dropdown = document.getElementById("user-dropdown");
    const trigger = document.querySelector(".top-bar-user");
    if (dropdown) dropdown.classList.remove("open");
    if (trigger) trigger.classList.remove("open");
    document.removeEventListener("click", closeUserMenuOnClickOutside);
}

export function openProfileModal(event: Event): void {
    event.preventDefault();
    closeUserMenu();

    authFetch("/auth/me").then(async (res) => {
        if (res.ok) {
            const user = await res.json();
            (document.getElementById("profile-name") as HTMLInputElement).value = user.name || "";
            (document.getElementById("profile-email") as HTMLInputElement).value = user.email;
        }
    }).catch(() => {
        (document.getElementById("profile-name") as HTMLInputElement).value = "";
        (document.getElementById("profile-email") as HTMLInputElement).value = "";
    });

    (document.getElementById("profile-current-password") as HTMLInputElement).value = "";
    (document.getElementById("profile-new-password") as HTMLInputElement).value = "";
    (document.getElementById("profile-confirm-password") as HTMLInputElement).value = "";
    document.getElementById("password-strength")!.style.display = "none";
    document.getElementById("password-match-error")!.style.display = "none";

    const overlay = document.getElementById("profile-overlay")!;
    overlay.style.display = "flex";
    overlay.classList.add("show");
}

export function closeProfileModal(): void {
    const overlay = document.getElementById("profile-overlay")!;
    overlay.style.display = "none";
    overlay.classList.remove("show");
}

export async function handleProfileUpdate(event: Event): Promise<void> {
    event.preventDefault();

    const name = (document.getElementById("profile-name") as HTMLInputElement).value.trim();
    const email = (document.getElementById("profile-email") as HTMLInputElement).value;
    const currentPassword = (document.getElementById("profile-current-password") as HTMLInputElement).value;
    const newPassword = (document.getElementById("profile-new-password") as HTMLInputElement).value;
    const confirmPassword = (document.getElementById("profile-confirm-password") as HTMLInputElement).value;

    const body: Record<string, string> = {};

    if (name) body.name = name;
    if (email) body.email = email;

    if (newPassword) {
        if (!currentPassword) {
            toast("Current password required to change password", "error");
            return;
        }

        const validation = validatePasswordStrength(newPassword);
        if (!validation.isValid()) {
            toast("Password must be at least 8 characters with uppercase, lowercase, and number", "error");
            return;
        }

        if (!passwordsMatch(newPassword, confirmPassword)) {
            toast("Passwords do not match", "error");
            return;
        }

        body.current_password = currentPassword;
        body.new_password = newPassword;
    }

    try {
        const res = await authFetch("/auth/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (res.ok) {
            const user = await res.json();
            const userNameEl = document.getElementById("user-name");
            if (userNameEl) userNameEl.textContent = user.name;
            toast("Profile updated successfully");
            closeProfileModal();
        } else {
            const error = await res.json();
            toast(error.detail || "Failed to update profile", "error");
        }
    } catch (_err) {
        toast("Network error", "error");
    }
}

export function checkPasswordStrength(): void {
    const password = (document.getElementById("profile-new-password") as HTMLInputElement).value;
    const validation = validatePasswordStrength(password);

    updateStrengthIndicator("password-strength", "password-strength-text", 4, validation.strength());

    document.getElementById("req-length")!.className = validation.hasLength ? "met" : "unmet";
    document.getElementById("req-uppercase")!.className = validation.hasUppercase ? "met" : "unmet";
    document.getElementById("req-lowercase")!.className = validation.hasLowercase ? "met" : "unmet";
    document.getElementById("req-number")!.className = validation.hasNumber ? "met" : "unmet";

    checkPasswordMatch();
}

export function checkPasswordMatch(): void {
    const newPassword = (document.getElementById("profile-new-password") as HTMLInputElement).value;
    const confirmPassword = (document.getElementById("profile-confirm-password") as HTMLInputElement).value;
    updatePasswordMatchError("password-match-error", newPassword, confirmPassword);
}

export function checkRegisterPasswordStrength(): void {
    const password = (document.getElementById("register-password") as HTMLInputElement).value;
    const validation = validatePasswordStrength(password);

    updateStrengthIndicator("register-password-strength", "register-strength-text", 4, validation.strength());

    document.getElementById("register-req-length")!.className = validation.hasLength ? "met" : "unmet";
    document.getElementById("register-req-uppercase")!.className = validation.hasUppercase ? "met" : "unmet";
    document.getElementById("register-req-lowercase")!.className = validation.hasLowercase ? "met" : "unmet";
    document.getElementById("register-req-number")!.className = validation.hasNumber ? "met" : "unmet";

    checkRegisterPasswordMatch();
}

export function checkRegisterPasswordMatch(): void {
    const password = (document.getElementById("register-password") as HTMLInputElement).value;
    const confirmPassword = (document.getElementById("register-password-confirm") as HTMLInputElement).value;
    updatePasswordMatchError("register-password-match-error", password, confirmPassword);
}

export async function loadUserInfo(): Promise<void> {
    try {
        const res = await authFetch("/auth/me");
        if (res.ok) {
            const user = await res.json();
            const el = document.getElementById("user-name");
            if (el) el.textContent = user.name || user.email;
            const avatarEl = document.getElementById("user-avatar");
            if (avatarEl) {
                const initials = (user.name || user.email || "U").substring(0, 2).toUpperCase();
                avatarEl.textContent = initials;
            }
            const dropName = document.getElementById("dropdown-user-name");
            if (dropName) dropName.textContent = user.name || user.email;
            const dropEmail = document.getElementById("dropdown-user-email");
            if (dropEmail) dropEmail.textContent = user.email;
        }
    } catch (err) {
        console.error("Failed to load user info:", err);
    }
}

export function initApp(): void {
    const wrap = document.getElementById("app-wrap");
    const authOverlay = document.getElementById("auth-overlay");

    if (!isAuthenticated()) {
        if (wrap) wrap.style.display = "none";
        if (authOverlay) {
            authOverlay.classList.add("active");
            authOverlay.style.display = "flex";
        }
        switchAuthTab("login");
        return;
    }

    if (wrap) wrap.style.display = "flex";
    if (authOverlay) {
        authOverlay.classList.remove("active");
        authOverlay.style.display = "none";
    }

    loadUserInfo();
    fetchProjects();
    fetchLogStats();
}
