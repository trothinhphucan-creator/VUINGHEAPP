/**
 * In-App Browser Detection & External Browser Redirect
 * Detects when the app is opened inside social media app browsers
 * (Facebook, Zalo, Instagram, etc.) and helps redirect to external browser.
 */

/**
 * Check if current browser is an in-app browser (WebView)
 * @returns {boolean}
 */
export function isInAppBrowser() {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || navigator.vendor || "";
    const rules = [
        "FBAN", "FBAV",           // Facebook
        "Instagram",              // Instagram
        "Zalo",                   // Zalo
        "Line/",                  // Line
        "MicroMessenger",         // WeChat
        "Twitter", "TwitterAndroid", // Twitter/X
        "BytedanceWebview", "TikTok", // TikTok
        "Snapchat",               // Snapchat
        "Pinterest",              // Pinterest
        "LinkedInApp",            // LinkedIn
    ];
    return rules.some(r => ua.includes(r));
}

/**
 * Check if the device is mobile
 * @returns {boolean}
 */
export function isMobile() {
    if (typeof navigator === "undefined") return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Get the in-app browser name for display
 * @returns {string}
 */
export function getInAppBrowserName() {
    if (typeof navigator === "undefined") return "";
    const ua = navigator.userAgent || "";
    if (ua.includes("FBAN") || ua.includes("FBAV")) return "Facebook";
    if (ua.includes("Instagram")) return "Instagram";
    if (ua.includes("Zalo")) return "Zalo";
    if (ua.includes("Line/")) return "Line";
    if (ua.includes("MicroMessenger")) return "WeChat";
    if (ua.includes("Twitter") || ua.includes("TwitterAndroid")) return "Twitter/X";
    if (ua.includes("BytedanceWebview") || ua.includes("TikTok")) return "TikTok";
    if (ua.includes("Snapchat")) return "Snapchat";
    if (ua.includes("LinkedInApp")) return "LinkedIn";
    return "ứng dụng";
}

/**
 * Attempt to open the current URL in an external browser.
 * Uses platform-specific deep links.
 */
export function openInExternalBrowser() {
    const url = window.location.href;
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);

    if (isAndroid) {
        // Android: Use intent to open in Chrome or default browser
        const intentUrl = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`;
        window.location.href = intentUrl;

        // Fallback if Chrome not installed — try generic browser intent
        setTimeout(() => {
            const genericIntent = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;end`;
            window.location.href = genericIntent;
        }, 500);
    } else if (isIOS) {
        // iOS: Try opening in Safari via x-safari scheme
        // Note: This may not work in all in-app browsers
        window.location.href = `x-safari-${url}`;

        // Fallback: try window.open
        setTimeout(() => {
            window.open(url, "_blank");
        }, 500);
    } else {
        window.open(url, "_blank");
    }
}

/**
 * Copy current URL to clipboard
 * @returns {Promise<boolean>}
 */
export async function copyCurrentUrl() {
    try {
        await navigator.clipboard.writeText(window.location.href);
        return true;
    } catch {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = window.location.href;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand("copy");
            document.body.removeChild(textArea);
            return true;
        } catch {
            document.body.removeChild(textArea);
            return false;
        }
    }
}
