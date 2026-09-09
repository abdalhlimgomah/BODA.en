(function () {
  "use strict";

  const HASH_PREFIX = "boda_v1";
  const HASH_SEPARATOR = "$";
  const CLIENT_PEPPER = "Buda_CLIENT_PEPPER_2026";

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function textToBytes(text) {
    if (typeof TextEncoder !== "undefined") {
      return new TextEncoder().encode(text);
    }
    const bytes = [];
    for (let i = 0; i < text.length; i += 1) {
      bytes.push(text.charCodeAt(i) & 255);
    }
    return new Uint8Array(bytes);
  }

  function bytesToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  async function sha256Hex(text) {
    const input = textToBytes(String(text || ""));

    if (window.crypto && window.crypto.subtle && typeof window.crypto.subtle.digest === "function") {
      const digest = await window.crypto.subtle.digest("SHA-256", input);
      return bytesToHex(digest);
    }

    // Fallback hash to keep compatibility when SubtleCrypto is unavailable.
    let hash = 0;
    const raw = String(text || "");
    for (let i = 0; i < raw.length; i += 1) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    return `fallback_${Math.abs(hash)}`;
  }

  function randomSalt(length = 16) {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const bytes = new Uint8Array(length);

    if (window.crypto && typeof window.crypto.getRandomValues === "function") {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < length; i += 1) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }

    let output = "";
    for (let i = 0; i < bytes.length; i += 1) {
      output += chars.charAt(bytes[i] % chars.length);
    }
    return output;
  }

  function constantTimeEqual(a, b) {
    const left = String(a || "");
    const right = String(b || "");
    if (left.length !== right.length) return false;

    let diff = 0;
    for (let i = 0; i < left.length; i += 1) {
      diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
    }
    return diff === 0;
  }

  function isHashedPassword(value) {
    return String(value || "").startsWith(`${HASH_PREFIX}${HASH_SEPARATOR}`);
  }

  async function hashPassword(password, email = "") {
    const plain = String(password || "");
    const userEmail = normalizeEmail(email);
    const salt = randomSalt(18);
    const digest = await sha256Hex(`${plain}|${userEmail}|${salt}|${CLIENT_PEPPER}`);
    return `${HASH_PREFIX}${HASH_SEPARATOR}${salt}${HASH_SEPARATOR}${digest}`;
  }

  async function verifyPassword(password, storedValue, email = "") {
    const plain = String(password || "");
    const stored = String(storedValue || "");
    const userEmail = normalizeEmail(email);

    if (!stored) return false;

    if (!isHashedPassword(stored)) {
      // Backward compatibility with legacy clear-text rows.
      return constantTimeEqual(plain, stored);
    }

    const parts = stored.split(HASH_SEPARATOR);
    if (parts.length !== 3) return false;

    const [, salt, storedDigest] = parts;
    if (!salt || !storedDigest) return false;

    const computed = await sha256Hex(`${plain}|${userEmail}|${salt}|${CLIENT_PEPPER}`);
    return constantTimeEqual(storedDigest, computed);
  }

  function isStrongPassword(password) {
    const value = String(password || "");
    if (value.length < 8) return false;

    const hasLower = /[a-z]/.test(value);
    const hasUpper = /[A-Z]/.test(value);
    const hasDigit = /\d/.test(value);
    const hasSpecial = /[^A-Za-z0-9]/.test(value);
    return hasLower && hasUpper && hasDigit && hasSpecial;
  }

  function sanitizeText(value, maxLength = 300) {
    return String(value || "")
      .replace(/[\u0000-\u001F\u007F]/g, "")
      .trim()
      .slice(0, Math.max(1, maxLength));
  }

  function isPrivateIPv4(host) {
    const text = String(host || "").trim();
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(text)) return false;

    const parts = text.split(".").map((part) => Number(part));
    if (parts.some((part) => !Number.isFinite(part) || part < 0 || part > 255)) return false;

    if (parts[0] === 10) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    return false;
  }

  function isLikelyDevelopmentHost(host) {
    const value = String(host || "").trim().toLowerCase();
    if (!value) return true;
    if (value === "localhost" || value === "127.0.0.1" || value === "0.0.0.0" || value === "::1") return true;
    if (value.endsWith(".local") || value.endsWith(".lan")) return true;
    if (isPrivateIPv4(value)) return true;
    return false;
  }

  function enforceClientRuntimeHardening() {
    const host = String(window.location.hostname || "").toLowerCase();
    const isLocal = isLikelyDevelopmentHost(host);

    if (!isLocal && window.location.protocol === "http:") {
      const secureUrl = `https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.location.replace(secureUrl);
      return;
    }

    // Basic clickjacking defense for client-rendered pages.
    if (window.top !== window.self) {
      try {
        window.top.location = window.location.href;
      } catch {
        // Intentionally ignore cross-origin frame access errors.
      }
    }
  }

  const securityApi = {
    normalizeEmail,
    hashPassword,
    verifyPassword,
    isHashedPassword,
    isStrongPassword,
    sanitizeText,
    enforceClientRuntimeHardening,
  };

  window.BudaSecurity = Object.freeze(securityApi);
  enforceClientRuntimeHardening();
})();
