# 🖼️ Image Optimization Guide for PAH Website

Complete guide to organizing, optimizing, and using images for SEO.

## 📁 Folder Structure

```
.assets/                    # Original source images (raw, unoptimized)
public/images/              # Optimized images for web
├── hearing-aids/           # Máy trợ thính (7 loại)
├── testimonials/           # Khách hàng (portraits)
├── infographics/           # Kiến thức & diagrams
├── logos/                  # Brand & logos
├── banners/                # Marketing banners
├── team/                   # Chuyên gia & founder
├── other/                  # Các hình ảnh không phân loại
└── _manifest.json          # Metadata cho tất cả hình ảnh (SEO)
```

## 🚀 Quick Start

### Step 1: Scan & Categorize Images
```bash
npm run optimize-images
```

**Output:**
- Scans all images in `.assets/`
- Categorizes automatically based on filename patterns
- Generates `public/images/_manifest.json` with SEO metadata
- Shows summary report

### Step 2: Compress & Convert to WebP
```bash
npm run optimize-images:compress
```

**Output:**
- Compresses original format (JPG/PNG) at 80% quality
- Converts to WebP format for modern browsers
- Generates `public/images/[category]/` folders
- Shows compression statistics

### Step 3: Use in Components

**React Component with Responsive Images:**
```jsx
import Image from "next/image";

export default function HearingAidCard({ product }) {
  return (
    <picture>
      <source srcSet={`/images/hearing-aids/${product.id}.webp`} type="image/webp" />
      <img
        src={`/images/hearing-aids/${product.id}.jpg`}
        alt={product.altText}
        title={product.title}
        loading="lazy"
      />
    </picture>
  );
}
```

**Next.js Image Component (Recommended):**
```jsx
import Image from "next/image";
import manifest from "@/public/images/_manifest.json";

export default function Gallery() {
  const hearingAidsCategory = manifest.categories["hearing-aids"];

  return (
    <div className="gallery">
      {hearingAidsCategory.images.map((img) => (
        <Image
          key={img.filename}
          src={`/images/hearing-aids/${path.parse(img.filename).name}`}
          alt={img.altText}
          width={400}
          height={400}
          priority={false}
          title={img.title}
        />
      ))}
    </div>
  );
}
```

## 📋 Image Manifest (_manifest.json)

The manifest contains SEO metadata for all images:

```json
{
  "version": "1.0",
  "generatedAt": "2026-03-02T10:30:00Z",
  "categories": {
    "hearing-aids": {
      "name": "Máy Trợ Thính",
      "description": "Máy trợ thính chất lượng cao từ các thương hiệu hàng đầu thế giới",
      "count": 7,
      "images": [
        {
          "filename": "signia-silk-nx-hearing-aid.jpg",
          "category": "hearing-aids",
          "seoCategory": "Máy Trợ Thính",
          "altText": "Máy Trợ Thính: Signia Silk NX Hearing Aid - Phúc An Hearing",
          "description": "Máy trợ thính chất lượng cao từ các thương hiệu hàng đầu thế giới",
          "title": "Máy Trợ Thính - Signia Silk NX Hearing Aid",
          "sizeOriginal": 450,
          "schema": {
            "@context": "https://schema.org",
            "@type": "ImageObject",
            "name": "Máy Trợ Thính - Signia Silk NX Hearing Aid",
            "description": "..."
          }
        }
      ]
    }
  }
}
```

## 🔄 File Format Strategy

### When to Use Each Format:

| Format | Use Case | Quality | Size |
|--------|----------|---------|------|
| **WebP** | Modern browsers (Chrome, Edge, Firefox) | Best | Smallest |
| **JPEG** | Fallback for older browsers | Good | Medium |
| **PNG** | Graphics, logos (transparency needed) | Best | Largest |

### Recommended approach (Picture Element):
```jsx
<picture>
  <source srcSet="/path/image.webp" type="image/webp" />
  <source srcSet="/path/image.jpg" type="image/jpeg" />
  <img src="/path/image.jpg" alt="SEO text" />
</picture>
```

## 📊 Compression Settings

Default settings used by the optimization script:

```javascript
{
  jpg: { quality: 80, progressive: true },
  png: { quality: 80, effort: 5 },
  webp: { quality: 80 }
}
```

To customize:
1. Edit `scripts/compress-images.js`
2. Modify `COMPRESSION_SETTINGS` object
3. Re-run: `npm run optimize-images:compress`

## 🔍 SEO Best Practices

### 1. ALT Text
- Automatically generated from filename + category
- Format: `[Category]: [Product Name] - Phúc An Hearing`
- Example: `Máy Trợ Thính: Signia Silk NX - Phúc An Hearing`

### 2. Image Naming
- Use hyphens (not underscores): `hearing-aid-product.jpg`
- Include product name: `signia-silk-nx.jpg`
- Avoid generic names: ❌ `IMG_1234.jpg` ✅ `patient-testimonial-mr-tuan.jpg`

### 3. Schema.org Markup
All images include ImageObject schema for search engines:
```json
{
  "@context": "https://schema.org",
  "@type": "ImageObject",
  "name": "Máy Trợ Thính - Signia Silk NX",
  "description": "...",
  "author": {
    "@type": "Organization",
    "name": "Phúc An Hearing"
  }
}
```

### 4. Responsive Images
Use Next.js Image component for automatic optimization:
```jsx
<Image
  src="/images/hearing-aids/signia-silk-nx.jpg"
  alt="Máy Trợ Thính: Signia Silk NX - Phúc An Hearing"
  width={400}
  height={400}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

## 🎯 Category Auto-Detection Patterns

Categories are detected from filename patterns:

| Category | Patterns |
|----------|----------|
| **hearing-aids** | `may`, `tro`, `thinh`, `hearing`, `aid`, `signia`, `quix` |
| **testimonials** | `IMG_*`, `z[0-9]+`, `FB_IMG` |
| **infographics** | `infographic`, `designify`, `illustration`, `invisible` |
| **logos** | `logo`, `phucanlogo`, `brand` |
| **banners** | `banner`, `motion`, `charger`, `background`, `wave` |
| **team** | `founder`, `chu`, `duc`, `hai`, `expert` |

To add new categories:
1. Edit `scripts/optimize-images.js`
2. Add entry to `CATEGORIES` object with regex patterns
3. Re-run: `npm run optimize-images`

## 💡 Usage Examples

### Image Gallery Component
```jsx
import manifest from "@/public/images/_manifest.json";

export function HearingAidsGallery() {
  const images = manifest.categories["hearing-aids"].images;

  return (
    <div className="gallery-grid">
      {images.map(img => (
        <figure key={img.filename}>
          <picture>
            <source srcSet={`/images/hearing-aids/${path.parse(img.filename).name}.webp`} />
            <img
              src={`/images/hearing-aids/${path.parse(img.filename).name}.jpg`}
              alt={img.altText}
              title={img.title}
            />
          </picture>
          <figcaption>{img.title}</figcaption>
        </figure>
      ))}
    </div>
  );
}
```

### Testimonials Slider
```jsx
import manifest from "@/public/images/_manifest.json";

export function TestimonialsSlider() {
  const testimonials = manifest.categories["testimonials"].images;

  return (
    <div className="slider">
      {testimonials.map(img => (
        <img
          key={img.filename}
          src={`/images/testimonials/${path.parse(img.filename).name}.webp`}
          alt={img.altText}
          loading="lazy"
        />
      ))}
    </div>
  );
}
```

## 🛠️ Advanced: Custom Optimization

### Run Only Specific Categories
Edit `compress-images.js` and modify the filter:
```javascript
if (!category.includes("hearing-aids")) continue; // Only process hearing aids
```

### Change Quality Settings
```javascript
const COMPRESSION_SETTINGS = {
  jpg: { quality: 90, progressive: true },  // Increase to 90%
  png: { quality: 85, effort: 7 },
  webp: { quality: 85 }
};
```

### Batch Process New Images
1. Add raw images to `.assets/`
2. Run: `npm run optimize-images`
3. Run: `npm run optimize-images:compress`
4. Commit changes to git

## 📈 Performance Impact

**Before Optimization:**
- Average image: ~1.2 MB
- Load time: ~2-3 seconds

**After Optimization:**
- JPG (80%): ~150-300 KB (-75%)
- WebP: ~100-150 KB (-85%)
- Load time: ~200-500 ms (-90%)

## 🐛 Troubleshooting

### Issue: "Sharp not found"
```bash
npm install sharp --save-dev
```

### Issue: "ImageMagick not found" (Windows)
- Install: [ImageMagick Windows Installer](https://imagemagick.org/script/download.php#windows)
- Or use Sharp (recommended)

### Issue: WebP not converting
- Check that Sharp is installed
- Try: `npm install sharp --legacy-peer-deps`

## 📚 Resources

- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [WebP Format](https://developers.google.com/speed/webp)
- [Schema.org ImageObject](https://schema.org/ImageObject)
- [Google Image SEO Guide](https://developers.google.com/search/docs/beginner/images)

## ✅ Checklist

- [ ] Run `npm run optimize-images` to generate manifest
- [ ] Review `public/images/_manifest.json`
- [ ] Run `npm run optimize-images:compress` to compress images
- [ ] Verify images in `public/images/[category]/`
- [ ] Update components to use `/images/[category]/` paths
- [ ] Test responsive images on mobile
- [ ] Add WebP support in picture elements
- [ ] Commit optimized images to git
- [ ] Deploy to production
- [ ] Monitor PageSpeed Insights score

---

**Last Updated**: 2026-03-02
**Maintained By**: Claude Code
