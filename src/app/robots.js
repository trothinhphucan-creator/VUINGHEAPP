export default function robots() {
    return {
        rules: [
            {
                userAgent: "*",
                allow: ["/", "/hearing-test", "/hearing-aid-simulator", "/booking"],
                disallow: ["/admin", "/dashboard", "/api/"],
            },
        ],
        sitemap: "https://hearingtest.pah.vn/sitemap.xml",
        host: "https://hearingtest.pah.vn",
    };
}
