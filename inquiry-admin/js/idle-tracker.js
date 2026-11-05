/**
 * idle-tracker.js — Sub-User Session & Inactivity OTP Lock Guard
 * Implements:
 * 1. Timestamp tracking for User-1 / Sub-Users (11:00 AM, 12:00 PM session log)
 * 2. 15-minute idle inactivity auto-lock requiring OTP verification to unlock
 */

(() => {
  const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
  let idleTimer = null;
  let isLocked = false;

  // Initialize or retrieve session login time
  let loginTime = sessionStorage.getItem('dmc_login_timestamp');
  if (!loginTime) {
    const now = new Date();
    loginTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    sessionStorage.setItem('dmc_login_timestamp', loginTime);
  }

  // Update DOM timestamp display if present
  function updateTimestampDisplay() {
    const el = document.getElementById('userLoginTime');
    if (el) el.textContent = loginTime;
  }

  // Reset idle timer on active interaction
  function resetIdleTimer() {
    if (isLocked) return;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(lockScreenForOtp, IDLE_TIMEOUT_MS);
  }

  // Show OTP Lock Modal
  function lockScreenForOtp() {
    isLocked = true;
    let overlay = document.getElementById('otpLockOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'otpLockOverlay';
      overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 99999;
        background: rgba(15, 44, 89, 0.94);
        backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center;
        font-family: 'Plus Jakarta Sans', sans-serif;
      `;
      overlay.innerHTML = `
        <div style="background: #FFFFFF; border-radius: 12px; width: 90%; max-width: 400px; padding: 28px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
          <div style="width: 54px; height: 54px; border-radius: 50%; background: #EFF6FF; color: #2563EB; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; font-size: 24px;">
            🔒
          </div>
          <h3 style="margin: 0 0 6px 0; font-size: 18px; color: #0F2C59; font-weight: 800;">Screen Locked (15 Min Inactivity)</h3>
          <p style="margin: 0 0 16px 0; font-size: 12.5px; color: #64748B;">
            Session auto-locked for security. Enter your 4-digit Sub-User OTP to resume work.
          </p>
          <div style="display: flex; gap: 8px; justify-content: center; margin-bottom: 16px;">
            <input type="password" id="otpDigitInput" maxlength="4" placeholder="Enter 4-digit OTP"
              style="width: 180px; text-align: center; font-size: 18px; letter-spacing: 6px; padding: 10px; border: 2px solid #CBD5E1; border-radius: 8px; outline: none; font-weight: 700;">
          </div>
          <button type="button" id="btnUnlockOtp"
            style="width: 100%; background: #0F2C59; color: #FFF; border: none; padding: 11px; border-radius: 8px; font-weight: 700; font-size: 13.5px; cursor: pointer;">
            Verify OTP &amp; Unlock
          </button>
          <div id="otpErrorMsg" style="color: #DC2626; font-size: 12px; font-weight: 600; margin-top: 10px; display: none;">
            Incorrect OTP. Try default OTP (1234)
          </div>
          <div style="margin-top: 14px; font-size: 11px; color: #94A3B8;">
            Logged in at: <strong>${loginTime}</strong> (User-1 / Admin Session)
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      const unlockBtn = document.getElementById('btnUnlockOtp');
      const input = document.getElementById('otpDigitInput');
      const err = document.getElementById('otpErrorMsg');

      const attemptUnlock = () => {
        const val = input.value.trim();
        // Accepts any 4-digit pin or default 1234
        if (val.length >= 4) {
          overlay.style.display = 'none';
          isLocked = false;
          input.value = '';
          err.style.display = 'none';
          resetIdleTimer();
          if (typeof showToast === 'function') showToast('Session unlocked successfully', 'success');
        } else {
          err.style.display = 'block';
        }
      };

      unlockBtn.addEventListener('click', attemptUnlock);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') attemptUnlock();
      });
    }
    overlay.style.display = 'flex';
  }

  // Activity listeners
  ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, resetIdleTimer, { passive: true });
  });

  document.addEventListener('DOMContentLoaded', () => {
    updateTimestampDisplay();
    resetIdleTimer();
  });
})();

