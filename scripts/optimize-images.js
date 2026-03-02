#!/usr/bin/env node

/**
 * Image Optimization Script for PAH Website
 * Organizes, compresses, and optimizes images for web + SEO
 * Usage: node scripts/optimize-images.js
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Configuration
const ASSETS_DIR = path.join(__dirname, "..", "assets");
const PUBLIC_IMAGES_DIR = path.join(__dirname, "..", "public", "images");
const METADATA_FILE = path.join(PUBLIC_IMAGES_DIR, "_manifest.json");

// Category patterns
const CATEGORIES = {
    "hearing-aids": {
        patterns: [/may.*tro.*thinh|hearing.*aid|signia|quix/i],
        seoCategory: "Máy Trợ Thính",
        description: "Máy trợ thính chất lượng cao từ các thương hiệu hàng đầu thế giới",
    },
    testimonials: {
        patterns: [/IMG_[0-9]+|z[0-9]+|FB_IMG/i],
        seoCategory: "Khách Hàng",
        description: "Những khách hàng hài lòng đã sử dụng dịch vụ của PAH",
    },
    infographics: {
        patterns: [/infographic|designify|illustration|invisible/i],
        seoCategory: "Kiến Thức",
        description: "Thông tin đồ họa về thính giác và máy trợ thính",
    },
    logos: {
        patterns: [/logo|phucanlogo|brand/i],
        seoCategory: "Logo & Branding",
        description: "Logo và tài sản thương hiệu PAH",
    },
    banners: {
        patterns: [/banner|motion|charger|background|wave/i],
        seoCategory: "Banner Marketing",
        description: "Banner quảng cáo cho các chiến dịch marketing",
    },
    team: {
        patterns: [/founder|chu.*duc.*hai|expert/i],
        seoCategory: "Chuyên Gia",
        description: "Những chuyên gia hàng đầu tại PAH",
    },
};

// Image metadata template
function generateAltText(filename, category) {
    const nameClean = path.parse(filename).name
        .replace(/[_\-\d]/g, " ")
        .trim();

    const categoryInfo = CATEGORIES[category] || {
        seoCategory: "Khác",
        description: "Hình ảnh khác"
    };
    return `${categoryInfo.seoCategory}: ${nameClean} - Phúc An Hearing`;
}

function generateImageMetadata(filename, category, filePath) {
    const categoryInfo = CATEGORIES[category] || {
        seoCategory: "Khác",
        description: "Hình ảnh khác"
    };
    const stats = fs.statSync(filePath);

    return {
        filename,
        originalPath: filePath,
        category,
        seoCategory: categoryInfo.seoCategory,
        altText: generateAltText(filename, category),
        description: categoryInfo.description,
        title: `${categoryInfo.seoCategory} - ${path.parse(filename).name}`,
        sizeOriginal: Math.round(stats.size / 1024), // KB
        lastModified: stats.mtime.toISOString(),
        schema: {
            "@context": "https://schema.org",
            "@type": "ImageObject",
            name: `${categoryInfo.seoCategory} - ${path.parse(filename).name}`,
            description: categoryInfo.description,
            author: {
                "@type": "Organization",
                name: "Phúc An Hearing",
            },
        },
    };
}

function categorizeFile(filename) {
    for (const [category, config] of Object.entries(CATEGORIES)) {
        if (config.patterns.some(pattern => pattern.test(filename))) {
            return category;
        }
    }
    return "other";
}

function ensureDirectories() {
    Object.keys(CATEGORIES).forEach(category => {
        const dir = path.join(PUBLIC_IMAGES_DIR, category);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

function scanAssets() {
    const files = fs.readdirSync(ASSETS_DIR);
    const imageFiles = files.filter(f => {
        const ext = path.extname(f).toLowerCase();
        return [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext);
    });

    console.log(`📸 Found ${imageFiles.length} image files in .assets\n`);

    const categorized = {};
    imageFiles.forEach(file => {
        const category = categorizeFile(file);
        if (!categorized[category]) categorized[category] = [];
        categorized[category].push(file);
    });

    return categorized;
}

function generateManifest(categorized) {
    const manifest = {
        version: "1.0",
        generatedAt: new Date().toISOString(),
        categories: {},
    };

    Object.entries(categorized).forEach(([category, files]) => {
        manifest.categories[category] = {
            name: CATEGORIES[category]?.seoCategory || category,
            description: CATEGORIES[category]?.description || "",
            count: files.length,
            images: files.map(filename => {
                const filePath = path.join(ASSETS_DIR, filename);
                return generateImageMetadata(filename, category, filePath);
            }),
        };
    });

    fs.writeFileSync(METADATA_FILE, JSON.stringify(manifest, null, 2));
    console.log(`✅ Metadata manifest saved to: ${METADATA_FILE}`);
}

function printSummary(categorized) {
    console.log("\n═══════════════════════════════════════════════════");
    console.log("📊 IMAGE CATEGORIZATION SUMMARY");
    console.log("═══════════════════════════════════════════════════\n");

    Object.entries(categorized).forEach(([category, files]) => {
        const categoryInfo = CATEGORIES[category];
        console.log(`\n🏷️  ${categoryInfo?.seoCategory || category.toUpperCase()} (${files.length} files)`);
        console.log(`   Description: ${categoryInfo?.description || "Not categorized"}`);
        files.slice(0, 3).forEach(file => {
            console.log(`   • ${file}`);
        });
        if (files.length > 3) {
            console.log(`   ... and ${files.length - 3} more`);
        }
    });

    console.log("\n═══════════════════════════════════════════════════\n");
}

function main() {
    console.log("🚀 Starting Image Optimization Script\n");

    if (!fs.existsSync(ASSETS_DIR)) {
        console.error(`❌ .assets directory not found at ${ASSETS_DIR}`);
        process.exit(1);
    }

    // Step 1: Ensure output directories exist
    ensureDirectories();

    // Step 2: Scan and categorize
    const categorized = scanAssets();

    // Step 3: Print summary
    printSummary(categorized);

    // Step 4: Generate metadata manifest
    generateManifest(categorized);

    console.log("\n✨ Next Steps:");
    console.log("1. Review metadata in: public/images/_manifest.json");
    console.log("2. Run: npm run optimize-images:compress (to compress & convert to WebP)");
    console.log("3. Import images in components using: src='/images/[category]/[filename]'");
    console.log("4. Use ALT text from manifest for SEO\n");
}

main();
