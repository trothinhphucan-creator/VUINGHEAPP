"use client";

import { useState, useEffect, useRef } from "react";

/* ── Intersection Observer hook for scroll animations ── */
function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/* ═══════════════════════════════════════════════════
   NAVIGATION
   ═══════════════════════════════════════════════════ */
function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className="nav" style={scrolled ? { background: "rgba(5,10,24,0.95)" } : {}}>
      <div className="nav-inner">
        <a href="#" className="nav-logo">
          <span className="nav-logo-icon">🦻</span>
          Phúc An Hearing
        </a>

        <ul className={`nav-links${menuOpen ? " open" : ""}`}>
          <li><a href="#hearing-test" onClick={() => setMenuOpen(false)}>Đo thính lực</a></li>
          <li><a href="#education" onClick={() => setMenuOpen(false)}>Kiến thức về tai</a></li>
          <li><a href="#expert" onClick={() => setMenuOpen(false)}>Chuyên gia</a></li>
          <li><a href="#hearing-aid" onClick={() => setMenuOpen(false)}>Tiện ích thính học</a></li>
          <li className="mobile-cta" style={{ display: "none" }}>
            <a href="#" className="btn btn-google" onClick={() => setMenuOpen(false)}>
              <GoogleIcon /> Đăng nhập
            </a>
          </li>
        </ul>

        <div className="nav-cta">
          <a href="#" className="btn btn-google">
            <GoogleIcon /> Đăng nhập
          </a>
        </div>

        <button
          className="nav-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>
    </nav>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════
   HERO SECTION
   ═══════════════════════════════════════════════════ */
function HeroSection() {
  return (
    <section className="hero section" id="hero">
      {/* Background halo effect */}
      <div className="hero-bg">
        <div className="halo-ring"></div>
        <div className="halo-ring"></div>
        <div className="halo-ring"></div>
        <div className="halo-ring"></div>
        <div className="hero-glow-1"></div>
        <div className="hero-glow-2"></div>
      </div>

      <div className="hero-content">
        <div className="hero-icon">
          <div className="hero-icon-inner">🦻</div>
        </div>

        <h1>
          Thính giác quý giá —<br />
          <span className="gradient-text">Hãy bảo vệ ngay hôm nay</span>
        </h1>

        <p className="hero-subtitle">
          Mỗi ngày trì hoãn là một ngày mất kết nối với thế giới âm thanh xung quanh bạn.
          <strong> Đo thính lực trực tuyến MIỄN PHÍ</strong> — ngay trên điện thoại hay máy tính, chỉ mất 5 phút.
        </p>

        <div className="hero-cta-group">
          <a href="/hearing-test" className="btn btn-primary btn-lg">
            🎧 Đo Thính Lực Ngay — Miễn Phí
          </a>
          <a href="#education" className="btn btn-outline">
            Tìm hiểu thêm ↓
          </a>
        </div>

        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hero-stat-value">466M+</div>
            <div className="hero-stat-label">Người nghe kém toàn cầu</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-value">6.1%</div>
            <div className="hero-stat-label">Dân số Việt Nam bị ảnh hưởng</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-value">80%</div>
            <div className="hero-stat-label">Chưa được chẩn đoán & điều trị</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   HEARING TEST CTA
   ═══════════════════════════════════════════════════ */
function HearingTestCTA() {
  const [ref, visible] = useInView();
  return (
    <section className="section cta-section" id="hearing-test" ref={ref}>
      <div className={`section-inner fade-in-up${visible ? " visible" : ""}`}>
        <div className="section-header">
          <span className="section-label">Kiểm tra miễn phí</span>
          <h2 className="section-title">
            <span className="gradient-text">Đo Thính Lực Online</span> — Chuẩn Lâm Sàng
          </h2>
          <p className="section-subtitle">
            Phương pháp Hughson-Westlake được sử dụng tại các bệnh viện hàng đầu, nay có thể thực hiện ngay trên thiết bị của bạn.
          </p>
        </div>

        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">🎧</div>
            <h3>Chỉ cần tai nghe</h3>
            <p>Đeo tai nghe trong môi trường yên tĩnh. Hệ thống sẽ hướng dẫn bạn từng bước.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⏱️</div>
            <h3>5 phút hoàn thành</h3>
            <p>Kiểm tra 6 tần số trên 2 tai. Nhấn nút khi nghe thấy âm thanh — đơn giản và nhanh chóng.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Thính lực đồ chi tiết</h3>
            <p>Nhận kết quả audiogram chuyên nghiệp kèm đánh giá mức nghe và lời khuyên từ chuyên gia.</p>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 36 }}>
          <a href="/hearing-test" className="btn btn-primary btn-lg" style={{ maxWidth: 400, width: "100%" }}>
            🎧 Bắt Đầu Kiểm Tra Ngay
          </a>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   EDUCATION FACTS
   ═══════════════════════════════════════════════════ */
const FACTS = [
  {
    emoji: "🧠",
    stat: "466 triệu",
    title: "Người trên thế giới bị nghe kém",
    desc: "Theo WHO, 5% dân số toàn cầu cần can thiệp thính giác. Nghe kém không điều trị làm tăng 200% nguy cơ sa sút trí tuệ.",
    source: "WHO, 2024",
  },
  {
    emoji: "👶",
    title: "Nghe kém ảnh hưởng mọi lứa tuổi",
    desc: "Trẻ nhỏ bị nghe kém có thể chậm phát triển ngôn ngữ. Người lớn tuổi nghe kém dễ bị cô lập xã hội, trầm cảm và suy giảm nhận thức.",
    source: null,
  },
  {
    emoji: "🔇",
    title: "Ù tai (Tinnitus) — Dấu hiệu cảnh báo",
    desc: "Ù tai kéo dài là dấu hiệu cảnh báo tổn thương thính giác. Khoảng 15-20% dân số trải qua ù tai ở các mức độ khác nhau.",
    source: null,
  },
  {
    emoji: "🏭",
    title: "Nguyên nhân gây nghe kém",
    desc: "Tiếng ồn, lão hóa, nhiễm trùng tai, di truyền, ototoxic... Nhiều trường hợp có thể phòng ngừa nếu phát hiện sớm.",
    source: null,
  },
  {
    emoji: "⚠️",
    stat: "~7 năm",
    title: "Trung bình trì hoãn điều trị",
    desc: "Đa số người nghe kém chờ 7 năm trước khi tìm cách điều trị. Mỗi năm trì hoãn, khả năng phục hồi giảm đáng kể.",
    source: null,
  },
  {
    emoji: "🦻",
    title: "Máy trợ thính — Giải pháp hiệu quả",
    desc: "Máy trợ thính hiện đại thu nhận, xử lý lọc ồn và khuếch đại âm thanh phù hợp. Giúp người nghe kém giao tiếp tự nhiên trở lại.",
    source: "vuinghe.com",
    sourceUrl: "https://vuinghe.com",
  },
];

function EducationSection() {
  const [ref, visible] = useInView();
  return (
    <section className="section facts-section" id="education" ref={ref}>
      <div className={`section-inner fade-in-up${visible ? " visible" : ""}`}>
        <div className="section-header">
          <span className="section-label">Kiến thức thính học</span>
          <h2 className="section-title">
            Hiểu đúng về <span className="gradient-text">Sức khỏe Thính giác</span>
          </h2>
          <p className="section-subtitle">
            Những sự thật quan trọng mà bạn cần biết để bảo vệ thính giác cho bản thân và gia đình.
          </p>
        </div>

        <div className="facts-grid">
          {FACTS.map((fact, i) => (
            <div className="fact-card" key={i}>
              <span className="fact-emoji">{fact.emoji}</span>
              {fact.stat && <span className="fact-stat">{fact.stat}</span>}
              <h4>{fact.title}</h4>
              <p>{fact.desc}</p>
              {fact.source && (
                <a
                  className="fact-source"
                  href={fact.sourceUrl || "#"}
                  target={fact.sourceUrl ? "_blank" : undefined}
                  rel={fact.sourceUrl ? "noopener noreferrer" : undefined}
                >
                  📎 Nguồn: {fact.source}
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Anchor links to vuinghe.com articles */}
        <div style={{ textAlign: "center", marginTop: 40 }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: 16 }}>
            Tìm hiểu chuyên sâu từ Ths. Chu Đức Hải:
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
            <a href="https://vuinghe.com" target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
              Máy trợ thính là gì?
            </a>
            <a href="https://vuinghe.com" target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
              Cấu tạo máy trợ thính
            </a>
            <a href="https://vuinghe.com" target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
              Cách chọn máy trợ thính
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   EXPERT WIDGET
   ═══════════════════════════════════════════════════ */
function ExpertSection() {
  const [ref, visible] = useInView();
  return (
    <section className="section expert-section" id="expert" ref={ref}>
      <div className={`section-inner fade-in-up${visible ? " visible" : ""}`}>
        <div className="section-header">
          <span className="section-label">Chuyên gia thính học</span>
          <h2 className="section-title">
            Đồng hành cùng <span className="gradient-text">Chuyên gia hàng đầu</span>
          </h2>
        </div>

        <div className="expert-card">
          <div className="expert-avatar-wrapper">
            <img
              src="https://vuinghe.com/wp-content/uploads/2022/01/Untitled-1-01-1-1.png"
              alt="Ths. Chu Đức Hải — Chuyên gia máy trợ thính"
              className="expert-avatar"
              loading="lazy"
            />
            <div className="expert-name">Ths. Chu Đức Hải</div>
            <div className="expert-title-text">Chuyên gia Thính học</div>
          </div>

          <div className="expert-info">
            <h3>Thạc sĩ Kỹ thuật Y Sinh Học — ĐHBK Hà Nội</h3>
            <ul className="expert-credentials">
              <li>Nguyên Trưởng VP Đại Diện Siemens Hearing tại Việt Nam</li>
              <li>Chuyên gia đào tạo sản phẩm SIGNIA, Audio Service, Phonak</li>
              <li>Giám đốc chi nhánh phía Bắc MED-EL, Advanced Bionics</li>
              <li>Sáng lập và điều hành Trung tâm PAH (Phúc An Hearing) & mạng lưới PAH Network toàn quốc</li>
              <li>Luận văn thạc sĩ: Nghiên cứu ứng dụng thính giác điện tử phục hồi sức nghe cho người khiếm thính</li>
            </ul>
            <div className="expert-cta-buttons">
              <a href="https://zalo.me/818788000" target="_blank" rel="noopener noreferrer" className="btn btn-zalo">
                💬 Tư Vấn Qua Zalo
              </a>
              <a href="https://vuinghe.com" target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                🌐 vuinghe.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   HEARING AID SIMULATOR CTA
   ═══════════════════════════════════════════════════ */
function HearingAidCTA() {
  const [ref, visible] = useInView();
  return (
    <section className="section" id="hearing-aid" ref={ref}>
      <div className={`section-inner fade-in-up${visible ? " visible" : ""}`}>
        <div className="cta-box" style={{ maxWidth: 800 }}>
          <div className="section-label" style={{ marginBottom: 20 }}>Tiện ích thính học</div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 14 }}>
            🔊 Nghe Thử Máy Trợ Thính Online
          </h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: 24, lineHeight: 1.7 }}>
            Trải nghiệm mô phỏng hiệu quả của máy trợ thính dành cho mức nghe kém <strong>nhẹ đến trung bình</strong>.
            Hệ thống sẽ áp dụng bộ lọc âm thanh dựa trên thính lực đồ của bạn.
          </p>
          <div className="cta-features" style={{ marginBottom: 24 }}>
            <span className="cta-feature"><span className="check">✓</span> Mô phỏng thực tế</span>
            <span className="cta-feature"><span className="check">✓</span> Dựa trên audiogram</span>
            <span className="cta-feature"><span className="check">✓</span> Miễn phí hoàn toàn</span>
          </div>
          <a href="/hearing-aid-simulator" className="btn btn-primary" style={{ padding: "14px 36px" }}>
            🦻 Trải Nghiệm Nghe Thử
          </a>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   PAH INTRODUCTION WIDGET
   ═══════════════════════════════════════════════════ */
function PAHSection() {
  const [ref, visible] = useInView();
  return (
    <section className="section pah-section" id="about" ref={ref}>
      <div className={`section-inner fade-in-up${visible ? " visible" : ""}`}>
        <div className="section-header">
          <span className="section-label">Về chúng tôi</span>
          <h2 className="section-title">
            <span className="gradient-text">Phúc An Hearing</span> (PAH)
          </h2>
        </div>

        <div className="pah-card">
          <p className="pah-tagline">
            &ldquo;<em>An Tâm Trọn Vẹn Hành Trình Nghe</em>&rdquo;
          </p>
          <p className="pah-desc">
            Phúc An Hearing (PAH) là trung tâm trợ thính cao cấp được sáng lập bởi Ths. Chu Đức Hải —
            chuyên gia hàng đầu Việt Nam trong lĩnh vực máy trợ thính. Với sứ mệnh phát triển trợ thính
            chất lượng cao, chi phí phải chăng để mọi người Việt Nam đều có thể tiếp cận được.
          </p>

          <div className="pah-features">
            <div className="pah-feature">
              <div className="pah-feature-icon">🏥</div>
              <h4>Đo thính lực chuyên sâu</h4>
              <p>Trang thiết bị hiện đại, kết quả chính xác</p>
            </div>
            <div className="pah-feature">
              <div className="pah-feature-icon">🦻</div>
              <h4>Máy trợ thính cao cấp</h4>
              <p>Các thương hiệu hàng đầu thế giới</p>
            </div>
            <div className="pah-feature">
              <div className="pah-feature-icon">🤝</div>
              <h4>Đồng hành trọn đời</h4>
              <p>Chăm sóc sau bán hàng suốt quá trình sử dụng</p>
            </div>
            <div className="pah-feature">
              <div className="pah-feature-icon">🌐</div>
              <h4>PAH Network</h4>
              <p>Mạng lưới trợ thính trên toàn quốc</p>
            </div>
          </div>

          <a
            href="https://zalo.me/818788000"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-lg"
            style={{ maxWidth: 400, width: "100%", margin: "0 auto", display: "flex" }}
          >
            📅 Đặt Lịch Tư Vấn Miễn Phí
          </a>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   BOTTOM CTA
   ═══════════════════════════════════════════════════ */
function BottomCTA() {
  const [ref, visible] = useInView();
  return (
    <section className="section cta-section" ref={ref}>
      <div className={`section-inner fade-in-up${visible ? " visible" : ""}`}>
        <div className="cta-box">
          <h2>
            Bạn nghe rõ <span className="gradient-text">tới đâu?</span>
          </h2>
          <p>
            Chỉ 5 phút kiểm tra có thể thay đổi cuộc sống của bạn.
            Phát hiện sớm giúp bảo vệ thính giác và chất lượng giao tiếp.
          </p>
          <div className="cta-features">
            <span className="cta-feature"><span className="check">✓</span> Miễn phí 100%</span>
            <span className="cta-feature"><span className="check">✓</span> Không cần tài khoản</span>
            <span className="cta-feature"><span className="check">✓</span> Kết quả tức thì</span>
          </div>
          <a href="/hearing-test" className="btn btn-primary btn-lg" style={{ maxWidth: 400, width: "100%" }}>
            🎧 Đo Thính Lực Ngay
          </a>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <h3>🦻 Phúc An Hearing (PAH)</h3>
          <p className="footer-brand-tagline">&ldquo;An Tâm Trọn Vẹn Hành Trình Nghe&rdquo;</p>
          <p>
            Sáng lập: Ths. Chu Đức Hải<br />
            Thạc sĩ Kỹ thuật Y Sinh Học — ĐHBK Hà Nội<br />
            📞 Hotline: <a href="tel:0818788000">0818 788 000</a>
          </p>
        </div>

        <div className="footer-col">
          <h4>Dịch vụ</h4>
          <ul>
            <li><a href="/hearing-test">Đo thính lực online</a></li>
            <li><a href="/hearing-aid-simulator">Nghe thử máy trợ thính</a></li>
            <li><a href="https://vuinghe.com" target="_blank" rel="noopener noreferrer">Tư vấn trợ thính</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Kiến thức</h4>
          <ul>
            <li><a href="https://vuinghe.com" target="_blank" rel="noopener noreferrer">Máy trợ thính là gì?</a></li>
            <li><a href="https://vuinghe.com" target="_blank" rel="noopener noreferrer">Cấu tạo máy trợ thính</a></li>
            <li><a href="https://vuinghe.com" target="_blank" rel="noopener noreferrer">Nguyên nhân nghe kém</a></li>
            <li><a href="https://vuinghe.com" target="_blank" rel="noopener noreferrer">Blog vuinghe.com</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Liên hệ</h4>
          <ul>
            <li><a href="https://zalo.me/818788000" target="_blank" rel="noopener noreferrer">💬 Zalo</a></li>
            <li><a href="https://www.facebook.com/ths.chu.duc.hai/" target="_blank" rel="noopener noreferrer">📘 Facebook</a></li>
            <li><a href="https://www.youtube.com/@maytrothinhcaocap" target="_blank" rel="noopener noreferrer">▶️ YouTube</a></li>
            <li><a href="tel:0818788000">📞 0818 788 000</a></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 Phúc An Hearing (PAH). Công cụ sàng lọc — không thay thế khám chuyên khoa.</span>
        <div className="footer-social">
          <a href="https://vuinghe.com" target="_blank" rel="noopener noreferrer" title="Website">🌐</a>
          <a href="https://zalo.me/818788000" target="_blank" rel="noopener noreferrer" title="Zalo">💬</a>
          <a href="https://www.facebook.com/ths.chu.duc.hai/" target="_blank" rel="noopener noreferrer" title="Facebook">📘</a>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════
   PAGE EXPORT
   ═══════════════════════════════════════════════════ */
export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <HearingTestCTA />
        <EducationSection />
        <ExpertSection />
        <HearingAidCTA />
        <PAHSection />
        <BottomCTA />
      </main>
      <Footer />
    </>
  );
}
