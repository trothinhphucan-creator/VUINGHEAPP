import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata = {
  metadataBase: new URL("https://hearingtest.pah.vn"),
  title: "Đo Thính Lực Online Miễn Phí | Phúc An Hearing (PAH)",
  description:
    "Kiểm tra thính lực trực tuyến miễn phí bằng phương pháp Hughson-Westlake chuẩn lâm sàng. Đo thính lực ngay trên điện thoại hoặc máy tính. Tư vấn bởi Ths. Chu Đức Hải — Chuyên gia máy trợ thính hàng đầu Việt Nam.",
  keywords: [
    "đo thính lực",
    "máy đo thính lực",
    "máy trợ thính",
    "kiểm tra thính lực online",
    "đo sức nghe",
    "thính lực đồ",
    "audiogram",
    "nghe kém",
    "trợ thính Phúc An",
    "PAH",
  ],
  authors: [{ name: "Ths. Chu Đức Hải", url: "https://vuinghe.com" }],
  creator: "Phúc An Hearing (PAH)",
  openGraph: {
    title: "Đo Thính Lực Online Miễn Phí | Phúc An Hearing",
    description:
      "Kiểm tra thính lực miễn phí bằng phương pháp chuẩn lâm sàng. Sử dụng ngay trên điện thoại hoặc máy tính.",
    url: "https://hearingtest.pah.vn",
    siteName: "Phúc An Hearing",
    locale: "vi_VN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Đo Thính Lực Online Miễn Phí | Phúc An Hearing",
    description:
      "Kiểm tra thính lực trực tuyến miễn phí — phương pháp Hughson-Westlake chuẩn lâm sàng.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://hearingtest.pah.vn",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={inter.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#00d4ff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="PAH Hearing" />
        {/* Schema.org Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "MedicalOrganization",
              name: "Phúc An Hearing (PAH)",
              url: "https://vuinghe.com",
              description:
                "Trung tâm trợ thính cao cấp — Đo thính lực, tư vấn và cung cấp máy trợ thính chất lượng cao.",
              founder: {
                "@type": "Person",
                name: "Ths. Chu Đức Hải",
                jobTitle: "Thạc sĩ Kỹ thuật Y Sinh Học — ĐHBK Hà Nội",
              },
              telephone: "0818788000",
              sameAs: [
                "https://www.facebook.com/ths.chu.duc.hai/",
                "https://www.youtube.com/@maytrothinhcaocap",
                "https://zalo.me/818788000",
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "Đo thính lực online có chính xác không?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Công cụ đo thính lực online sử dụng phương pháp Hughson-Westlake chuẩn lâm sàng, cho kết quả sàng lọc ban đầu. Tuy nhiên, để có kết quả chính xác nhất, bạn nên đến gặp chuyên gia thính học.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Máy trợ thính là gì?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Máy trợ thính là thiết bị y tế hỗ trợ người suy giảm thính giác bằng cách thu nhận, xử lý và khuếch đại âm thanh phù hợp với mức nghe kém của từng người.",
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
        {GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga4-init" strategy="afterInteractive">{`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}', { page_path: window.location.pathname });
            `}</Script>
          </>
        )}
      </body>
    </html>
  );
}
