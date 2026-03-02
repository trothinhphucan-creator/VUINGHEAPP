#!/usr/bin/env node

/**
 * Image Compression & WebP Conversion Script
 * Compresses original images and converts to WebP format
 * Usage: node scripts/compress-images.js
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PUBLIC_IMAGES_DIR = path.join(__dirname, "..", "public", "images");
const METADATA_FILE = path.join(PUBLIC_IMAGES_DIR, "_manifest.json");

// Compression settings
const COMPRESSION_SETTINGS = {
    jpg: { quality: 80, progressive: true },
    png: { quality: 80, effort: 5 },
    webp: { quality: 80 },
};

// Check if ImageMagick is available
function checkImageMagick() {
    try {
        execSync("magick --version", { stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
}

// Check if FFmpeg is available
function checkFFmpeg() {
    try {
        execSync("ffmpeg -version", { stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
}

// Use fallback: install sharp npm package
async function installSharp() {
    console.log("📦 Installing 'sharp' for image processing...");
    try {
        execSync("npm install sharp --save-dev", { stdio: "inherit" });
        return true;
    } catch (err) {
        console.error("❌ Failed to install sharp");
        return false;
    }
}

function getFileSize(filePath) {
    const stats = fs.statSync(filePath);
    return stats.size;
}

function formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function compressWithSharp(inputPath, outputPath, format = "jpeg") {
    const sharp = require("sharp");
    const settings = COMPRESSION_SETTINGS[format] || COMPRESSION_SETTINGS.jpg;

    return sharp(inputPath)
        .resize(2000, 2000, {
            fit: "inside",
            withoutEnlargement: true,
        })
        [format](settings)
        .toFile(outputPath);
}

function processImagesWithSharp(manifest) {
    console.log("\n🖼️  Processing images with Sharp...\n");

    let totalOriginal = 0;
    let totalCompressed = 0;
    let processedCount = 0;

    Object.entries(manifest.categories).forEach(([category, categoryData]) => {
        categoryData.images.forEach(image => {
            const inputPath = image.originalPath;
            const outputDir = path.join(PUBLIC_IMAGES_DIR, category);

            if (!fs.existsSync(inputPath)) {
                console.log(`⚠️  Skipped (not found): ${image.filename}`);
                return;
            }

            const ext = path.extname(image.filename).toLowerCase().slice(1);
            const basename = path.parse(image.filename).name;

            // Compress original format
            const compressedPath = path.join(outputDir, `${basename}.${ext}`);
            try {
                compressWithSharp(inputPath, compressedPath, ext === "jpg" ? "jpeg" : ext);
                const originalSize = getFileSize(inputPath);
                const compressedSize = getFileSize(compressedPath);
                totalOriginal += originalSize;
                totalCompressed += compressedSize;
                const saved = Math.round(((originalSize - compressedSize) / originalSize) * 100);
                console.log(
                    `✅ ${image.filename} (${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)}, ${saved}% saved)`
                );
                processedCount++;
            } catch (err) {
                console.error(`❌ Error processing ${image.filename}: ${err.message}`);
            }

            // Convert to WebP
            const webpPath = path.join(outputDir, `${basename}.webp`);
            try {
                compressWithSharp(inputPath, webpPath, "webp");
                console.log(`   → WebP variant created`);
            } catch (err) {
                console.warn(`   ⚠️  WebP conversion failed: ${err.message}`);
            }
        });
    });

    return { processedCount, totalOriginal, totalCompressed };
}

function main() {
    console.log("🚀 Starting Image Compression\n");

    if (!fs.existsSync(METADATA_FILE)) {
        console.error(`❌ Metadata file not found: ${METADATA_FILE}`);
        console.error("   Run 'node scripts/optimize-images.js' first\n");
        process.exit(1);
    }

    const manifest = JSON.parse(fs.readFileSync(METADATA_FILE, "utf8"));

    console.log("🔍 Checking available tools...");
    const hasMagick = checkImageMagick();
    const hasFFmpeg = checkFFmpeg();
    const hasSharp = (() => {
        try {
            require.resolve("sharp");
            return true;
        } catch {
            return false;
        }
    })();

    console.log(`   ImageMagick: ${hasMagick ? "✅" : "❌"}`);
    console.log(`   FFmpeg: ${hasFFmpeg ? "✅" : "❌"}`);
    console.log(`   Sharp: ${hasSharp ? "✅" : "❌"}\n`);

    if (!hasMagick && !hasFFmpeg && !hasSharp) {
        console.log(
            "No image processing tools found. Installing Sharp (recommended for Node.js)...\n"
        );
        installSharp();
    }

    const stats = processImagesWithSharp(manifest);

    console.log("\n═══════════════════════════════════════════════════");
    console.log("📊 COMPRESSION SUMMARY");
    console.log("═══════════════════════════════════════════════════");
    console.log(`✅ Processed: ${stats.processedCount} images`);
    console.log(`📦 Original size: ${formatFileSize(stats.totalOriginal)}`);
    console.log(`📦 Compressed size: ${formatFileSize(stats.totalCompressed)}`);
    const totalSaved = Math.round(
        ((stats.totalOriginal - stats.totalCompressed) / stats.totalOriginal) * 100
    );
    console.log(`💾 Total saved: ${totalSaved}%\n`);

    console.log("✨ Next Steps:");
    console.log("1. Verify images in: public/images/*/");
    console.log("2. Use WebP format in browsers that support it:");
    console.log(`   <picture>`);
    console.log(`     <source srcSet="/images/category/image.webp" type="image/webp" />`);
    console.log(`     <img src="/images/category/image.jpg" alt="SEO text" />`);
    console.log(`   </picture>`);
    console.log("3. Add to sitemap: public/sitemap.xml");
    console.log("4. Update components to use optimized images\n");
}

main();
