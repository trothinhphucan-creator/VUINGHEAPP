const BASE_URL = "https://hearingtest.pah.vn";

export default function sitemap() {
    return [
        { url: BASE_URL,                              lastModified: new Date(), changeFrequency: "weekly",  priority: 1.0 },
        { url: `${BASE_URL}/hearing-test`,            lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
        { url: `${BASE_URL}/hearing-aid-simulator`,   lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
        { url: `${BASE_URL}/sound-level-meter`,       lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
        { url: `${BASE_URL}/booking`,                 lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
        { url: `${BASE_URL}/dashboard`,               lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    ];
}
