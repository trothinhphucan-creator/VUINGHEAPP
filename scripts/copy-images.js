#!/usr/bin/env node

/**
 * Copy Selected Images to public/images/
 * Copies high-quality images from assets/ to public/ for web use
 * Usage: node scripts/copy-images.js
 */

const fs = require("fs");
const path = require("path");

const IMAGES_TO_COPY = {
    // Logos
    "public/images/logos/logo-white.png": "assets/Logo white.PNG",
    "public/images/logos/pah-logo.png": "assets/phucanlogo.png",

    // Team
    "public/images/team/chu-duc-hai.jpg": "assets/Studio Session-075.jpg",

    // Hearing Aids
    "public/images/hearing-aids/signia-silk-nx.jpg": "assets/signia-silk-nx-hearing-aid.jpg",
    "public/images/hearing-aids/may-tro-thinh-cic.jpg": "assets/May tro thinh sieu nho CIC IIC.jpg",
    "public/images/hearing-aids/signia-hero.jpg": "assets/Signia-Xperience_Silk-X_fingers_1920x1080.jpg",
    "public/images/hearing-aids/in-the-ear.png": "assets/In-The-Ear-Hearing-Aid.png",

    // Testimonials (latest z5882* batch - best quality)
    "public/images/testimonials/khach-hang-1.jpg": "assets/z5882483283495_f4d49f52559f002a9997bf25c30602de.jpg",
    "public/images/testimonials/khach-hang-2.jpg": "assets/z5882483283579_114b64079e5324ae87f6d11a3480edf4.jpg",
    "public/images/testimonials/khach-hang-3.jpg": "assets/z5882483304783_8d77a65044b20c1fc514650a39196c26.jpg",
    "public/images/testimonials/khach-hang-4.jpg": "assets/z5882483304786_85a6b90a42be7bedf0cb891f663b33c9.jpg",
    "public/images/testimonials/khach-hang-5.jpg": "assets/z5882483304788_37953a701a67e9daaeaa4b57f25b2334.jpg",
    "public/images/testimonials/khach-hang-6.jpg": "assets/z5882483304791_8143fa67a72ed3a6ec7694345a87951e.jpg",
};

const APP_ROOT = path.join(__dirname, "..");

function ensureDir(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function copyFile(src, dest) {
    const srcPath = path.join(APP_ROOT, src);
    const destPath = path.join(APP_ROOT, dest);

    if (!fs.existsSync(srcPath)) {
        console.warn(`⚠️  Source not found: ${src}`);
        return false;
    }

    ensureDir(destPath);

    try {
        fs.copyFileSync(srcPath, destPath);
        const srcSize = fs.statSync(srcPath).size;
        console.log(`✅ Copied: ${path.basename(src)} (${formatBytes(srcSize)}) → ${dest}`);
        return true;
    } catch (err) {
        console.error(`❌ Error copying ${src}: ${err.message}`);
        return false;
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function main() {
    console.log("🖼️  Starting image copy process...\n");

    const entries = Object.entries(IMAGES_TO_COPY);
    let successCount = 0;
    let failCount = 0;

    for (const [dest, src] of entries) {
        if (copyFile(src, dest)) {
            successCount++;
        } else {
            failCount++;
        }
    }

    console.log("\n═══════════════════════════════════════════════════");
    console.log("📊 Copy Summary");
    console.log("═══════════════════════════════════════════════════");
    console.log(`✅ Successful: ${successCount}/${entries.length}`);
    if (failCount > 0) {
        console.log(`❌ Failed: ${failCount}/${entries.length}`);
    }
    console.log("\n✨ Images are now ready in public/images/");
    console.log("   Use them in components: <img src=\"/images/category/file.jpg\" />\n");
}

main();
