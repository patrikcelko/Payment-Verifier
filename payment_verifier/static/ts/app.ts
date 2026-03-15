/**
 * Payment Verifier - main entry point
 */
import { initApp, logout, toggleUserMenu, openProfileModal, closeProfileModal, handleProfileUpdate, handleLogin, handleRegister, switchAuthTab, checkPasswordStrength, checkPasswordMatch, checkRegisterPasswordStrength, checkRegisterPasswordMatch } from "@/core/auth";
import { switchTab, confirmYes, confirmNo } from "@/core/ui";
import { fetchProjects, render, toggleSelector, selectStatus, openCreateModal, openEditModal, closeProjectModal, submitModal, quickVerify, deleteProject, copyVerifyUrl } from "@/sections/projects";
import { fetchLogs, fetchLogStats, filterLogs, logsPage, toggleAutoRefresh, exportCSV, handleLogsSearchInput } from "@/sections/logs";
import { openGlobalMsgEditor, closeGlobalMsgEditor, saveGlobalMessage, resetAllGlobalMessages, openProjectMsgEditor, closeProjectMsgEditor, saveProjectMessage, removeProjectMessage, resetAllProjectMessages } from "@/sections/messages";

const W = window as unknown as Record<string, unknown>;

// Auth
W.logout = logout;
W.toggleUserMenu = toggleUserMenu;
W.openProfileModal = openProfileModal;
W.closeProfileModal = closeProfileModal;
W.handleProfileUpdate = handleProfileUpdate;
W.handleLogin = handleLogin;
W.handleRegister = handleRegister;
W.switchAuthTab = switchAuthTab;
W.checkPasswordStrength = checkPasswordStrength;
W.checkPasswordMatch = checkPasswordMatch;
W.checkRegisterPasswordStrength = checkRegisterPasswordStrength;
W.checkRegisterPasswordMatch = checkRegisterPasswordMatch;

// Navigation
W.switchTab = switchTab;

// Projects
W.fetchProjects = fetchProjects;
W.render = render;
W.toggleSelector = toggleSelector;
W.selectStatus = selectStatus;
W.openCreateModal = openCreateModal;
W.openEditModal = openEditModal;
W.closeModal = closeProjectModal;
W.submitModal = submitModal;
W.quickVerify = quickVerify;
W.deleteProject = deleteProject;
W.copyVerifyUrl = copyVerifyUrl;

// Logs
W.fetchLogs = fetchLogs;
W.fetchLogStats = fetchLogStats;
W.filterLogs = filterLogs;
W.logsPage = logsPage;
W.toggleAutoRefresh = toggleAutoRefresh;
W.exportCSV = exportCSV;

// Messages
W.openGlobalMsgEditor = openGlobalMsgEditor;
W.closeGlobalMsgEditor = closeGlobalMsgEditor;
W.saveGlobalMessage = saveGlobalMessage;
W.resetAllGlobalMessages = resetAllGlobalMessages;
W.openProjectMsgEditor = openProjectMsgEditor;
W.closeProjectMsgEditor = closeProjectMsgEditor;
W.saveProjectMessage = saveProjectMessage;
W.removeProjectMessage = removeProjectMessage;
W.resetAllProjectMessages = resetAllProjectMessages;

// Confirm
W.confirmYes = confirmYes;
W.confirmNo = confirmNo;

document.addEventListener("click", e => {
    if (!(e.target as HTMLElement).closest(".status-selector")) {
        document.querySelectorAll(".status-selector.open").forEach(s => s.classList.remove("open"));
    }
});

document.getElementById("modal-overlay")?.addEventListener("click", e => {
    if (e.target === e.currentTarget) closeProjectModal();
});
document.getElementById("me-global-overlay")?.addEventListener("click", e => {
    if (e.target === e.currentTarget) closeGlobalMsgEditor();
});
document.getElementById("me-project-overlay")?.addEventListener("click", e => {
    if (e.target === e.currentTarget) closeProjectMsgEditor();
});
document.getElementById("confirm-overlay")?.addEventListener("click", e => {
    if (e.target === e.currentTarget) confirmNo();
});

document.getElementById("search-input")?.addEventListener("input", () => render());
document.getElementById("logs-search-input")?.addEventListener("input", handleLogsSearchInput);

document.addEventListener("keydown", e => {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    if (e.key === "Escape") { closeProjectModal(); closeGlobalMsgEditor(); closeProjectMsgEditor(); }
    if (e.key === "n" || e.key === "N") { e.preventDefault(); openCreateModal(); }
    if (e.key === "m" || e.key === "M") { e.preventDefault(); openGlobalMsgEditor(); }
    if (e.key === "1") switchTab("projects");
    if (e.key === "2") switchTab("logs");
    if (e.key === "r" || e.key === "R") { e.preventDefault(); fetchProjects(); fetchLogStats(); }
});

// Copyright year
document.querySelectorAll<HTMLElement>(".copy-year").forEach(el => {
    el.textContent = String(new Date().getFullYear());
});

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}
