"""
HTML/CSS/JS templates for the ASI-Telemetry Authentication System.
Provides a modern, high-tech, responsive dark-mode UI for:
1. Connect Portal (/api/auth/connect)
2. Post-Auth Callback / Success Page (/api/auth/oauth/callback)
3. Friendly Error Recovery Page
"""

from typing import Optional
import html


BASE_CSS = """
    :root {
        --bg-canvas: #09090b;
        --bg-card: rgba(18, 18, 23, 0.85);
        --bg-card-border: rgba(255, 255, 255, 0.08);
        --bg-input: #0d0d12;
        --text-primary: #f4f4f6;
        --text-secondary: #94949e;
        --text-muted: #62626e;
        --accent-cyan: #06b6d4;
        --accent-cyan-glow: rgba(6, 182, 212, 0.25);
        --accent-indigo: #6366f1;
        --accent-emerald: #10b981;
        --accent-emerald-glow: rgba(16, 185, 129, 0.25);
        --accent-rose: #f43f5e;
        --accent-amber: #f59e0b;
        --radius-lg: 16px;
        --radius-md: 10px;
        --radius-full: 9999px;
        --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        --font-mono: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
    }

    * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
    }

    body {
        font-family: var(--font-family);
        background-color: var(--bg-canvas);
        color: var(--text-primary);
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        position: relative;
        overflow-x: hidden;
        -webkit-font-smoothing: antialiased;
    }

    /* Ambient Glowing Background Mesh */
    .ambient-glow-1 {
        position: fixed;
        top: -20%;
        left: 20%;
        width: 600px;
        height: 600px;
        background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0) 70%);
        border-radius: 50%;
        filter: blur(80px);
        z-index: 0;
        pointer-events: none;
        animation: pulse-slow 12s ease-in-out infinite alternate;
    }

    .ambient-glow-2 {
        position: fixed;
        bottom: -20%;
        right: 15%;
        width: 550px;
        height: 550px;
        background: radial-gradient(circle, rgba(6, 182, 212, 0.12) 0%, rgba(6, 182, 212, 0) 70%);
        border-radius: 50%;
        filter: blur(80px);
        z-index: 0;
        pointer-events: none;
        animation: pulse-slow 10s ease-in-out infinite alternate-reverse;
    }

    @keyframes pulse-slow {
        0% { transform: scale(0.9) translate(0, 0); opacity: 0.6; }
        100% { transform: scale(1.15) translate(20px, -20px); opacity: 1; }
    }

    .container {
        width: 100%;
        max-width: 480px;
        position: relative;
        z-index: 10;
    }

    .card {
        background: var(--bg-card);
        border: 1px solid var(--bg-card-border);
        border-radius: var(--radius-lg);
        padding: 2.5rem 2rem;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        text-align: center;
        transition: transform 0.3s ease;
    }

    /* Brand Header */
    .brand-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: var(--radius-full);
        padding: 0.35rem 0.85rem;
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--accent-cyan);
        margin-bottom: 1.5rem;
    }

    .brand-logo {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        margin-bottom: 1rem;
    }

    .brand-logo svg {
        width: 34px;
        height: 34px;
        filter: drop-shadow(0 0 12px var(--accent-cyan-glow));
    }

    .brand-logo span {
        font-size: 1.4rem;
        font-weight: 700;
        letter-spacing: -0.02em;
        background: linear-gradient(135deg, #ffffff 40%, #a1a1aa 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    h1 {
        font-size: 1.5rem;
        font-weight: 700;
        letter-spacing: -0.02em;
        color: #ffffff;
        margin-bottom: 0.6rem;
        line-height: 1.25;
    }

    p.subtitle {
        color: var(--text-secondary);
        font-size: 0.92rem;
        line-height: 1.55;
        margin-bottom: 1.75rem;
    }

    /* Information Context Box */
    .info-panel {
        background: rgba(13, 13, 18, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: var(--radius-md);
        padding: 1rem 1.15rem;
        margin-bottom: 1.75rem;
        text-align: left;
        font-size: 0.85rem;
    }

    .info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.35rem 0;
        color: var(--text-secondary);
    }

    .info-row:not(:last-child) {
        border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }

    .info-label {
        font-size: 0.8rem;
        color: var(--text-muted);
    }

    .info-value {
        font-weight: 500;
        color: var(--text-primary);
        font-family: var(--font-mono);
        font-size: 0.8rem;
    }

    .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.15rem 0.5rem;
        border-radius: var(--radius-full);
        font-size: 0.72rem;
        font-weight: 600;
    }

    .status-pill.active {
        background: rgba(16, 185, 129, 0.12);
        color: var(--accent-emerald);
        border: 1px solid rgba(16, 185, 129, 0.25);
    }

    .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background-color: currentColor;
        box-shadow: 0 0 6px currentColor;
        animation: blink 2s infinite ease-in-out;
    }

    @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
    }

    /* Buttons & Actions */
    .btn-google {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.85rem;
        width: 100%;
        padding: 0.95rem 1.5rem;
        background: #ffffff;
        color: #1f1f1f;
        border: none;
        border-radius: var(--radius-md);
        font-size: 0.98rem;
        font-weight: 600;
        cursor: pointer;
        text-decoration: none;
        box-shadow: 0 4px 14px rgba(255, 255, 255, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1);
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        position: relative;
        overflow: hidden;
    }

    .btn-google:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(255, 255, 255, 0.25);
        background: #fbfbfb;
    }

    .btn-google:active {
        transform: translateY(0);
    }

    .btn-google svg {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
    }

    .btn-secondary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        width: 100%;
        padding: 0.8rem 1.25rem;
        background: rgba(255, 255, 255, 0.05);
        color: var(--text-primary);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: var(--radius-md);
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        text-decoration: none;
        transition: all 0.2s ease;
        margin-top: 0.75rem;
    }

    .btn-secondary:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.2);
    }

    /* Auto-redirect progress bar */
    .countdown-wrap {
        margin-top: 1rem;
        font-size: 0.78rem;
        color: var(--text-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
    }

    .countdown-link {
        color: var(--accent-cyan);
        cursor: pointer;
        text-decoration: underline;
        font-weight: 500;
    }

    /* Handoff Code Presentation */
    .code-container {
        position: relative;
        background: #060608;
        border: 1px solid rgba(6, 182, 212, 0.3);
        border-radius: var(--radius-md);
        padding: 1.25rem 1rem;
        margin: 1.5rem 0 1rem;
        box-shadow: 0 0 25px rgba(6, 182, 212, 0.08);
    }

    .code-label {
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--accent-cyan);
        font-weight: 600;
        margin-bottom: 0.4rem;
    }

    .auth-code {
        font-family: var(--font-mono);
        font-size: 1.85rem;
        font-weight: 700;
        letter-spacing: 0.15em;
        color: #ffffff;
        user-select: all;
        margin-bottom: 0.75rem;
        text-shadow: 0 0 15px rgba(6, 182, 212, 0.4);
    }

    .btn-copy {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        background: rgba(6, 182, 212, 0.1);
        color: var(--accent-cyan);
        border: 1px solid rgba(6, 182, 212, 0.25);
        border-radius: var(--radius-full);
        padding: 0.5rem 1.25rem;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .btn-copy:hover {
        background: rgba(6, 182, 212, 0.2);
        box-shadow: 0 0 12px var(--accent-cyan-glow);
    }

    .btn-copy.copied {
        background: rgba(16, 185, 129, 0.15);
        color: var(--accent-emerald);
        border-color: rgba(16, 185, 129, 0.35);
    }

    /* Next Steps Guide */
    .steps-card {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: var(--radius-md);
        padding: 1.1rem;
        margin-top: 1.5rem;
        text-align: left;
    }

    .steps-title {
        font-size: 0.78rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted);
        margin-bottom: 0.75rem;
    }

    .step-item {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        font-size: 0.84rem;
        color: var(--text-secondary);
        margin-bottom: 0.6rem;
        line-height: 1.4;
    }

    .step-num {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.06);
        color: var(--text-primary);
        font-size: 0.72rem;
        font-weight: 700;
        flex-shrink: 0;
        margin-top: 1px;
    }

    .step-item.highlight .step-num {
        background: var(--accent-cyan);
        color: #09090b;
    }

    /* User profile pill */
    .user-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.6rem;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: var(--radius-full);
        padding: 0.3rem 0.8rem 0.3rem 0.4rem;
        margin-bottom: 1.25rem;
    }

    .user-avatar {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan));
        color: white;
        font-weight: 700;
        font-size: 0.75rem;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
    }

    .user-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .user-email {
        font-size: 0.82rem;
        font-weight: 500;
        color: var(--text-primary);
    }

    /* Toast notification */
    .toast {
        position: fixed;
        bottom: 2rem;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: #18181f;
        border: 1px solid var(--accent-emerald);
        color: #ffffff;
        padding: 0.75rem 1.25rem;
        border-radius: var(--radius-full);
        font-size: 0.85rem;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5), 0 0 15px var(--accent-emerald-glow);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        z-index: 100;
        pointer-events: none;
    }

    .toast.show {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
    }

    .security-badge {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
        font-size: 0.74rem;
        color: var(--text-muted);
        margin-top: 1rem;
    }

    .security-badge svg {
        width: 14px;
        height: 14px;
        color: var(--accent-emerald);
    }
"""


def render_connect_page(
    session_id: str,
    sender_address: str,
    auth_url: str,
    expires_in: int,
) -> str:
    """Renders the sleek Connect Account landing page."""
    masked_sender = (
        f"{sender_address[:10]}...{sender_address[-6:]}"
        if len(sender_address) > 20
        else (sender_address or "Authorized Agent")
    )
    masked_session = f"{session_id[:8]}...{session_id[-4:]}" if len(session_id) > 16 else session_id
    escaped_auth_url = html.escape(auth_url)
    escaped_sender = html.escape(sender_address)
    escaped_masked_sender = html.escape(masked_sender)
    escaped_masked_session = html.escape(masked_session)

    template = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ASI-Telemetry | Connect Account</title>
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <style>__BASE_CSS__</style>
</head>
<body>
    <div class="ambient-glow-1"></div>
    <div class="ambient-glow-2"></div>

    <div class="container">
        <div class="card">
            <!-- Brand Badge -->
            <div class="brand-badge">
                <span class="status-dot"></span>
                Secure Agent Authorization
            </div>

            <!-- Brand Logo -->
            <div class="brand-logo">
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="32" height="32" rx="8" fill="#181824"/>
                    <path d="M7 16H11L14 8L18 24L21 16H25" stroke="#06b6d4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="14" cy="8" r="2" fill="#6366f1"/>
                    <circle cx="18" cy="24" r="2" fill="#10b981"/>
                </svg>
                <span>ASI:Telemetry</span>
            </div>

            <h1>Connect Account</h1>
            <p class="subtitle">Authorize the AI Agent to query your usage summaries, execution traces, and telemetry.</p>

            <!-- Session Details -->
            <div class="info-panel">
                <div class="info-row">
                    <span class="info-label">Agent Sender</span>
                    <span class="info-value" title="__ESCAPED_SENDER__">__ESCAPED_MASKED_SENDER__</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Session ID</span>
                    <span class="info-value">__ESCAPED_MASKED_SESSION__</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Encryption</span>
                    <span class="info-value">PKCE S256 (OIDC)</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Session Status</span>
                    <span class="status-pill active">
                        <span class="status-dot"></span>
                        Ready to Connect
                    </span>
                </div>
            </div>

            <!-- Google OAuth Action -->
            <a href="__ESCAPED_AUTH_URL__" id="google-login-btn" class="btn-google">
                <svg viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17Z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24Z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"/>
                </svg>
                Continue with Google
            </a>

            <!-- Auto-forward countdown -->
            <div class="countdown-wrap" id="countdown-bar">
                <span>Redirecting to Google in <strong id="seconds-left">3</strong>s...</span>
                <span class="countdown-link" id="cancel-redirect">[Pause]</span>
            </div>

            <div class="security-badge">
                <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clip-rule="evenodd"/>
                </svg>
                <span>Zero passwords or API keys shared in chat. Single-use handoff.</span>
            </div>
        </div>
    </div>

    <script>
        (function() {
            var seconds = 3;
            var countdownEl = document.getElementById('seconds-left');
            var cancelBtn = document.getElementById('cancel-redirect');
            var bar = document.getElementById('countdown-bar');
            var timer = null;
            var authUrl = "__ESCAPED_AUTH_URL__";

            function startTimer() {
                timer = setInterval(function() {
                    seconds--;
                    if (seconds <= 0) {
                        clearInterval(timer);
                        window.location.href = authUrl;
                    } else if (countdownEl) {
                        countdownEl.textContent = seconds;
                    }
                }, 1000);
            }

            if (cancelBtn) {
                cancelBtn.addEventListener('click', function() {
                    if (timer) {
                        clearInterval(timer);
                        timer = null;
                        bar.innerHTML = '<span>Auto-forward paused. Click the button above to proceed.</span>';
                    }
                });
            }

            startTimer();
        })();
    </script>
</body>
</html>"""
    return (
        template.replace("__BASE_CSS__", BASE_CSS)
        .replace("__ESCAPED_AUTH_URL__", escaped_auth_url)
        .replace("__ESCAPED_SENDER__", escaped_sender)
        .replace("__ESCAPED_MASKED_SENDER__", escaped_masked_sender)
        .replace("__ESCAPED_MASKED_SESSION__", escaped_masked_session)
    )


def render_callback_page(
    handoff_code: str,
    email: str,
    name: str,
    picture: Optional[str] = None,
) -> str:
    """Renders the celebratory Post-Auth Success Page with 1-click copy."""
    escaped_code = html.escape(handoff_code)
    escaped_email = html.escape(email)
    escaped_name = html.escape(name or "Authorized User")
    initials = html.escape(name[0].upper() if name else email[0].upper() if email else "U")

    avatar_html = (
        f'<img src="{html.escape(picture)}" alt="{escaped_name}">'
        if picture
        else initials
    )

    template = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ASI-Telemetry | Account Connected</title>
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <style>__BASE_CSS__</style>
</head>
<body>
    <div class="ambient-glow-1"></div>
    <div class="ambient-glow-2"></div>

    <div class="container">
        <div class="card">
            <!-- Brand Badge -->
            <div class="brand-badge" style="color: var(--accent-emerald);">
                <span class="status-dot" style="color: var(--accent-emerald);"></span>
                Google Sign-In Verified
            </div>

            <!-- Brand Logo -->
            <div class="brand-logo">
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="32" height="32" rx="8" fill="#181824"/>
                    <path d="M7 16H11L14 8L18 24L21 16H25" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <circle cx="14" cy="8" r="2" fill="#06b6d4"/>
                    <circle cx="18" cy="24" r="2" fill="#10b981"/>
                </svg>
                <span>ASI:Telemetry</span>
            </div>

            <!-- User Pill -->
            <div class="user-pill">
                <div class="user-avatar">__AVATAR_HTML__</div>
                <span class="user-email">__ESCAPED_EMAIL__</span>
            </div>

            <h1>Account Linked</h1>
            <p class="subtitle">Complete the connection in your agent chat by submitting the authorization code below:</p>

            <!-- Handoff Code Box -->
            <div class="code-container">
                <div class="code-label">Single-Use Authorization Code</div>
                <div class="auth-code" id="auth-code-text">__ESCAPED_CODE__</div>
                <button id="copy-btn" class="btn-copy" onclick="copyAuthCode()">
                    <svg id="copy-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span id="copy-text">Copy Code</span>
                </button>
            </div>

            <!-- Step-by-step guidance -->
            <div class="steps-card">
                <div class="steps-title">Next Steps</div>
                <div class="step-item highlight">
                    <span class="step-num">1</span>
                    <span>Click <strong>Copy Code</strong> above (auto-copied).</span>
                </div>
                <div class="step-item">
                    <span class="step-num">2</span>
                    <span>Switch back to your <strong>ASI:One / Agentverse Chat</strong> tab.</span>
                </div>
                <div class="step-item">
                    <span class="step-num">3</span>
                    <span>Paste and send <code>__ESCAPED_CODE__</code> to activate your session.</span>
                </div>
            </div>

            <button class="btn-secondary" onclick="window.close()">Close Window</button>

            <div class="security-badge">
                <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clip-rule="evenodd"/>
                </svg>
                <span>Code expires in 10 minutes and can only be used once.</span>
            </div>
        </div>
    </div>

    <!-- Notification Toast -->
    <div id="toast" class="toast">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>Authorization code copied to clipboard!</span>
    </div>

    <script>
        function showToast() {
            var toast = document.getElementById('toast');
            if (!toast) return;
            toast.classList.add('show');
            setTimeout(function() {
                toast.classList.remove('show');
            }, 3500);
        }

        function copyAuthCode() {
            var codeEl = document.getElementById('auth-code-text');
            if (!codeEl) return;
            var codeText = codeEl.innerText.trim();
            var btn = document.getElementById('copy-btn');
            var btnText = document.getElementById('copy-text');
            var icon = document.getElementById('copy-icon');

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(codeText).then(function() {
                    if (btn) btn.classList.add('copied');
                    if (btnText) btnText.innerText = 'Copied!';
                    if (icon) icon.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
                    showToast();

                    setTimeout(function() {
                        if (btn) btn.classList.remove('copied');
                        if (btnText) btnText.innerText = 'Copy Code';
                        if (icon) icon.innerHTML = '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>';
                    }, 4000);
                }).catch(function(err) {
                    console.warn('Clipboard write failed:', err);
                });
            }
        }

        // Attempt automatic copy on load
        window.addEventListener('load', function() {
            try {
                var codeEl = document.getElementById('auth-code-text');
                if (!codeEl) return;
                var codeText = codeEl.innerText.trim();
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(codeText).then(function() {
                        var btn = document.getElementById('copy-btn');
                        var btnText = document.getElementById('copy-text');
                        var icon = document.getElementById('copy-icon');
                        if (btn) btn.classList.add('copied');
                        if (btnText) btnText.innerText = 'Copied!';
                        if (icon) icon.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
                        showToast();
                    }).catch(function() {});
                }
            } catch (e) {}
        });
    </script>
</body>
</html>"""
    return (
        template.replace("__BASE_CSS__", BASE_CSS)
        .replace("__AVATAR_HTML__", avatar_html)
        .replace("__ESCAPED_EMAIL__", escaped_email)
        .replace("__ESCAPED_CODE__", escaped_code)
    )


def render_error_page(
    title: str,
    detail: str,
    error_code: Optional[str] = None,
) -> str:
    """Renders a styled error recovery page."""
    escaped_title = html.escape(title)
    escaped_detail = html.escape(detail)
    escaped_code = html.escape(error_code or "AUTH_ERROR")

    template = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ASI-Telemetry | Connection Error</title>
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <style>__BASE_CSS__</style>
</head>
<body>
    <div class="ambient-glow-1"></div>
    <div class="ambient-glow-2"></div>

    <div class="container">
        <div class="card">
            <!-- Brand Badge -->
            <div class="brand-badge" style="color: var(--accent-rose); border-color: rgba(244, 63, 94, 0.2);">
                <span class="status-dot" style="color: var(--accent-rose);"></span>
                Authorization Notice
            </div>

            <!-- Brand Logo -->
            <div class="brand-logo">
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="32" height="32" rx="8" fill="#181824"/>
                    <circle cx="16" cy="16" r="10" stroke="#f43f5e" stroke-width="2"/>
                    <line x1="16" y1="11" x2="16" y2="17" stroke="#f43f5e" stroke-width="2" stroke-linecap="round"/>
                    <circle cx="16" cy="21" r="1.2" fill="#f43f5e"/>
                </svg>
                <span>ASI:Telemetry</span>
            </div>

            <h1>__ESCAPED_TITLE__</h1>
            <p class="subtitle">__ESCAPED_DETAIL__</p>

            <div class="info-panel" style="text-align: center;">
                <span class="info-label">Error Code:</span>
                <span class="info-value" style="color: var(--accent-rose); margin-left: 0.5rem;">__ESCAPED_CODE__</span>
            </div>

            <div class="steps-card">
                <div class="steps-title">How to Resolve</div>
                <div class="step-item">
                    <span class="step-num">1</span>
                    <span>Return to your <strong>ASI-Telemetry agent chat</strong>.</span>
                </div>
                <div class="step-item">
                    <span class="step-num">2</span>
                    <span>Send <code>connect my account</code> to generate a brand new session link.</span>
                </div>
            </div>

            <button class="btn-secondary" onclick="window.close()">Close Window</button>
        </div>
    </div>
</body>
</html>"""
    return (
        template.replace("__BASE_CSS__", BASE_CSS)
        .replace("__ESCAPED_TITLE__", escaped_title)
        .replace("__ESCAPED_DETAIL__", escaped_detail)
        .replace("__ESCAPED_CODE__", escaped_code)
    )
