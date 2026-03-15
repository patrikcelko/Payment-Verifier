import { vi } from "vitest";

document.body.innerHTML = `
  <div class="auth-overlay" id="auth-overlay" style="display:flex">
    <div class="auth-card">
      <div class="auth-tabs">
        <button class="auth-tab active">Login</button>
        <button class="auth-tab">Create Account</button>
      </div>
      <div class="auth-tab-content active" id="auth-tab-login">
        <form>
          <input id="login-email" type="email">
          <input id="login-password" type="password">
          <div id="login-error" style="display:none"></div>
          <button type="submit">Login</button>
        </form>
      </div>
      <div class="auth-tab-content" id="auth-tab-register" style="display:none">
        <form>
          <input id="register-name" type="text">
          <input id="register-email" type="email">
          <input id="register-password" type="password">
          <input id="register-password-confirm" type="password">
          <div id="register-password-strength" style="display:none">
            <div id="register-strength-bar-1" class="strength-bar"></div>
            <div id="register-strength-bar-2" class="strength-bar"></div>
            <div id="register-strength-bar-3" class="strength-bar"></div>
            <div id="register-strength-bar-4" class="strength-bar"></div>
            <div id="register-strength-text"></div>
            <li id="register-req-length"></li>
            <li id="register-req-uppercase"></li>
            <li id="register-req-lowercase"></li>
            <li id="register-req-number"></li>
          </div>
          <div id="register-password-match-error" style="display:none"></div>
          <div id="register-error" style="display:none"></div>
          <button type="submit">Create Account</button>
        </form>
      </div>
    </div>
  </div>
  <div class="app-layout" id="app-wrap" style="display:none">
    <header class="app-header">
      <div class="header-left">
        <img src="" alt="" class="header-logo">
        <div class="header-title-wrap">
          <h1><span class="accent">Payment</span> Verifier</h1>
          <p class="header-subtitle">Protect your revenue. Verify every payment.</p>
        </div>
      </div>
      <div class="header-right">
        <div class="header-stats">
          <div class="header-stat"><strong id="blocked-count">0</strong></div>
          <div class="header-stat"><strong id="total-count">0</strong></div>
          <div class="header-stat"><strong id="ok-count">0</strong></div>
          <div class="header-stat"><strong id="requests-count">0</strong></div>
        </div>
        <div class="top-bar-user" id="top-bar-user">
          <div class="user-avatar" id="user-avatar"></div>
          <span class="user-name" id="user-name">User</span>
        </div>
        <div class="user-dropdown" id="user-dropdown">
          <div class="user-dropdown-name" id="dropdown-user-name">User</div>
          <div class="user-dropdown-email" id="dropdown-user-email">user@example.com</div>
        </div>
      </div>
    </header>
    <div class="section-tabs-wrap">
    <nav class="section-tabs">
      <button class="section-tab active" data-tab="projects">Projects</button>
      <button class="section-tab" data-tab="logs">Request Logs <span class="tab-badge" id="logs-badge" style="display:none">0</span></button>
    </nav>
    </div>
    <main class="main-content">
      <div class="tab-content active" id="tab-projects">
        <div class="section-toolbar">
          <input type="text" id="search-input">
          <span id="count">0</span>
        </div>
        <div id="projects-grid" class="grid"></div>
        <div id="empty-state" style="display:none"></div>
        <div id="empty-search" style="display:none"></div>
      </div>
      <div class="tab-content" id="tab-logs">
        <div class="stats-bar-wrap" id="stats-bar-wrap" style="display:none">
          <strong id="stat-200">0</strong>
          <strong id="stat-402">0</strong>
          <strong id="stat-404">0</strong>
          <div class="stats-bar">
            <div class="bar-200" id="bar-200" style="width:0"></div>
            <div class="bar-402" id="bar-402" style="width:0"></div>
            <div class="bar-404" id="bar-404" style="width:0"></div>
          </div>
        </div>
        <div class="logs-toolbar">
          <div class="filter-chips">
            <button class="chip active">All</button>
            <button class="chip">200 OK</button>
            <button class="chip">402 Unpaid</button>
            <button class="chip">404 Not Found</button>
          </div>
          <input type="text" id="logs-search-input">
          <span id="logs-filter-info"></span>
        </div>
        <div class="logs-toolbar">
          <span id="logs-total">0</span>
          <button id="logs-prev" disabled>Prev</button>
          <span id="logs-page-info">1 / 1</span>
          <button id="logs-next">Next</button>
          <input type="checkbox" id="auto-refresh-toggle">
        </div>
        <table class="data-table"><tbody id="logs-body"></tbody></table>
        <div id="logs-empty" style="display:none"></div>
      </div>
    </main>
  </div>
  <div class="modal-overlay" id="modal-overlay">
    <div class="modal">
      <h2 id="modal-title">Add Project</h2>
      <input type="hidden" id="modal-project-id">
      <div id="modal-name-group"><input type="text" id="modal-name"></div>
      <div id="modal-status-group"><select id="modal-status"><option value="OK">OK</option></select></div>
      <input type="text" id="modal-customer-name">
      <textarea id="modal-customer-address"></textarea>
      <input type="url" id="modal-project-url">
      <input type="text" id="modal-contact-person">
      <input type="email" id="modal-contact-email">
      <input type="tel" id="modal-contact-phone">
      <button id="modal-submit">Create</button>
    </div>
  </div>
  <div class="me-overlay" id="me-global-overlay">
    <div class="me-panel"><div class="me-body" id="me-global-list"></div></div>
  </div>
  <div class="me-overlay" id="me-project-overlay">
    <div class="me-panel">
      <span id="pmsg-project-name"></span>
      <div class="me-body" id="me-project-list"></div>
    </div>
  </div>
  <div class="modal-overlay" id="profile-overlay" style="display:none">
    <div class="modal">
      <input id="profile-name" type="text">
      <input id="profile-email" type="email">
      <input id="profile-current-password" type="password">
      <input id="profile-new-password" type="password">
      <input id="profile-confirm-password" type="password">
      <div id="password-strength" style="display:none">
        <div id="password-strength-bar-1" class="strength-bar"></div>
        <div id="password-strength-bar-2" class="strength-bar"></div>
        <div id="password-strength-bar-3" class="strength-bar"></div>
        <div id="password-strength-bar-4" class="strength-bar"></div>
        <div id="password-strength-text"></div>
        <li id="req-length"></li>
        <li id="req-uppercase"></li>
        <li id="req-lowercase"></li>
        <li id="req-number"></li>
      </div>
      <div id="password-match-error" style="display:none"></div>
    </div>
  </div>
  <div class="confirm-overlay" id="confirm-overlay">
    <div class="confirm-dialog">
      <h4>Confirm</h4>
      <p></p>
      <div class="confirm-actions">
        <button>Cancel</button>
        <button>Confirm</button>
      </div>
    </div>
  </div>
  <div class="toast-container" id="toasts"></div>
  <span class="copy-year"></span>
`;

Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(""),
  },
});

window.confirm = vi.fn(() => true);

Element.prototype.scrollIntoView = vi.fn();
if (typeof CSS === "undefined") {
  (globalThis as any).CSS = { escape: (s: string) => s.replace(/([^\w-])/g, "\\$1") };
} else if (!CSS.escape) {
  CSS.escape = (s: string) => s.replace(/([^\w-])/g, "\\$1");
}
