"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function HearingTestPage() {
    const containerRef = useRef(null);
    const initialized = useRef(false);
    const { user, loading, signInWithGoogle } = useAuth();

    // Expose save function globally so app.js can call it
    useEffect(() => {
        window.pahSaveResult = async (results, evaluationLabel) => {
            if (!user) return;
            try {
                await addDoc(collection(db, "testResults"), {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    results,
                    evaluationLabel,
                    createdAt: serverTimestamp(),
                });
                console.log("✅ Results saved to Firestore!");
                return true;
            } catch (e) {
                console.error("Save failed:", e);
                return false;
            }
        };
    }, [user]);

    // Load CSS + JS from public folder
    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "/hearing-test/style.css";
        document.head.appendChild(link);

        const script = document.createElement("script");
        script.src = "/hearing-test/app.js";
        script.defer = true;
        document.body.appendChild(script);

        return () => {
            try { document.head.removeChild(link); } catch (_) { }
            try { document.body.removeChild(script); } catch (_) { }
        };
    }, []);

    const handleGoogleLogin = async () => {
        try {
            await signInWithGoogle();
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return null;

    return (
        <>
            {/* Back to home */}
            <div style={{ position: "fixed", top: 16, left: 16, zIndex: 9999 }}>
                <a
                    href="/"
                    style={{
                        display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px",
                        background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)",
                        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14,
                        color: "#e8ecf4", fontSize: "0.85rem", fontWeight: 600,
                        fontFamily: "'Inter', sans-serif", textDecoration: "none", transition: "all 0.3s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.borderColor = "rgba(0,212,255,0.3)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                >
                    ← Trang chủ
                </a>
            </div>

            {/* Auth button — top right */}
            <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, display: "flex", alignItems: "center", gap: 10 }}>
                {user ? (
                    <>
                        {user.photoURL && (
                            <img src={user.photoURL} alt="" style={{ width: 34, height: 34, borderRadius: "50%", border: "2px solid rgba(0,212,255,0.4)" }} />
                        )}
                        <a
                            href="/dashboard"
                            style={{
                                display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px",
                                background: "linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%)",
                                border: "none", borderRadius: 14, color: "#fff",
                                fontSize: "0.85rem", fontWeight: 600, fontFamily: "'Inter', sans-serif",
                                textDecoration: "none", boxShadow: "0 4px 20px rgba(0,212,255,0.25)",
                            }}
                        >
                            📊 Xem kết quả của tôi
                        </a>
                    </>
                ) : (
                    <button
                        onClick={handleGoogleLogin}
                        style={{
                            display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px",
                            background: "linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%)",
                            border: "none", borderRadius: 14, color: "#fff",
                            fontSize: "0.85rem", fontWeight: 600, fontFamily: "'Inter', sans-serif",
                            cursor: "pointer", boxShadow: "0 4px 20px rgba(0,212,255,0.25)",
                        }}
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                            <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Đăng nhập để lưu kết quả
                    </button>
                )}
            </div>

            {/* Original hearing test HTML structure */}
            <div ref={containerRef} className="app-container">
                {/* SCREEN 1: WELCOME */}
                <section className="screen active" id="screen-welcome">
                    <div className="card fade-in">
                        <div className="logo-icon">
                            <svg viewBox="0 0 64 64" fill="none">
                                <circle cx="32" cy="32" r="30" stroke="url(#g1)" strokeWidth="2" fill="rgba(0,212,255,0.08)" />
                                <circle cx="32" cy="29" r="3" fill="url(#g1)" />
                                <defs>
                                    <linearGradient id="g1" x1="0" y1="0" x2="64" y2="64">
                                        <stop offset="0%" stopColor="#00d4ff" />
                                        <stop offset="100%" stopColor="#7c3aed" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                        <p className="brand-label">Phúc An Hearing</p>
                        <h1>Kiểm Tra Thính Lực Online</h1>
                        <p className="subtitle">Đo sức nghe miễn phí — Phương pháp Hughson-Westlake chuẩn lâm sàng</p>

                        {/* Login prompt banner when not signed in */}
                        {!user && (
                            <div style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 14, padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
                                <span style={{ fontSize: 24 }}>💡</span>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#00d4ff", marginBottom: 4 }}>Đăng nhập để lưu & so sánh kết quả</div>
                                    <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Theo dõi thính lực của bạn qua thời gian. Miễn phí, bảo mật.</div>
                                </div>
                                <button onClick={handleGoogleLogin} style={{ marginLeft: "auto", whiteSpace: "nowrap", padding: "8px 14px", background: "#00d4ff", border: "none", borderRadius: 10, color: "#0a0f1e", fontWeight: 700, cursor: "pointer", fontSize: "0.8rem", flexShrink: 0 }}>
                                    Đăng nhập
                                </button>
                            </div>
                        )}

                        {user && (
                            <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 14, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                                {user.photoURL && <img src={user.photoURL} alt="" style={{ width: 28, height: 28, borderRadius: "50%" }} />}
                                <span style={{ color: "#10b981", fontWeight: 600, fontSize: "0.85rem" }}>✅ Đã đăng nhập — kết quả sẽ được lưu tự động</span>
                            </div>
                        )}

                        <div className="expert-badge">
                            <img src="https://vuinghe.com/wp-content/uploads/2022/01/Untitled-1-01-1-1.png" alt="Ths. Chu Đức Hải" className="expert-avatar" />
                            <div className="expert-info">
                                <span className="expert-name">Ths. Chu Đức Hải</span>
                                <span className="expert-title">Chuyên gia Thính học — Sáng lập PAH</span>
                            </div>
                        </div>

                        <div className="instructions">
                            <div className="instruction-item"><span className="step-num">1</span>
                                <div><strong>Đeo tai nghe</strong><p>Đảm bảo môi trường yên tĩnh, đeo đúng tai trái/phải</p></div>
                            </div>
                            <div className="instruction-item"><span className="step-num">2</span>
                                <div><strong>Hiệu chỉnh âm lượng</strong><p>Hệ thống sẽ phát âm mẫu, đặt âm lượng thiết bị ở mức khuyến nghị</p></div>
                            </div>
                            <div className="instruction-item"><span className="step-num">3</span>
                                <div><strong>Nhấn nút khi nghe thấy</strong><p>Âm thanh sẽ nhấp nháy 3 lần — nhấn nút ngay khi nghe được</p></div>
                            </div>
                        </div>
                        <div className="warning-box"><span className="warning-icon">⚠️</span><span>Kết quả chỉ mang tính sàng lọc, không thay thế khám chuyên khoa.</span></div>
                        <button className="btn btn-primary btn-lg pulse-glow" id="btn-start">🎧 Bắt Đầu Kiểm Tra</button>
                    </div>
                </section>

                {/* SCREEN 2: CALIBRATION */}
                <section className="screen" id="screen-calibration">
                    <div className="card fade-in">
                        <div className="calibration-icon">🔊</div>
                        <h2>Hiệu Chỉnh Âm Lượng</h2>
                        <p className="subtitle">Đặt âm lượng thiết bị ở mức <strong>50–70%</strong>.<br />Hệ thống sẽ phát âm mẫu 1000 Hz để kiểm tra.</p>
                        <div className="calib-volume-guide">
                            <div className="calib-vol-bar"><div className="calib-vol-fill"></div><div className="calib-vol-marker"></div></div>
                            <p className="calib-vol-text">Đặt âm lượng thiết bị khoảng <strong>60%</strong></p>
                        </div>
                        <div className="calibration-status">
                            <span className="calib-status-icon" id="calibration-status-icon">⏳</span>
                            <span className="calib-status-text" id="calibration-status-text">Đang chuẩn bị phát âm mẫu...</span>
                        </div>
                        <div className="calibration-actions" id="calibration-actions" style={{ display: "none" }}>
                            <button className="btn btn-outline" id="btn-calibration-replay">🔄 Phát lại</button>
                            <button className="btn btn-primary" id="btn-calibration-ok">✓ Nghe rõ, bắt đầu đo</button>
                        </div>
                    </div>
                </section>

                {/* SCREEN 3: TEST */}
                <section className="screen" id="screen-test">
                    <div className="card test-card fade-in">
                        <div className="test-top-row">
                            <svg className="progress-ring" viewBox="0 0 160 160">
                                <defs>
                                    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#00d4ff" />
                                        <stop offset="100%" stopColor="#7c3aed" />
                                    </linearGradient>
                                </defs>
                                <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
                                <circle cx="80" cy="80" r="70" fill="none" stroke="url(#ringGrad)" strokeWidth="7"
                                    strokeLinecap="round" strokeDasharray="440" strokeDashoffset="440"
                                    transform="rotate(-90 80 80)" id="progress-ring-circle"
                                    style={{ transition: "stroke-dashoffset 0.6s ease" }} />
                                <text x="80" y="65" textAnchor="middle" fill="#e8ecf4" fontSize="22" fontWeight="800" fontFamily="Inter,sans-serif" id="ring-step">1/12</text>
                                <text x="80" y="90" textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="500" fontFamily="Inter,sans-serif" id="ring-ear">Tai Phải</text>
                            </svg>
                        </div>
                        <div className="ear-badge right" id="test-ear-badge"><span className="ear-dot right"></span><span className="ear-text" id="test-ear-label">Tai Phải</span></div>
                        <div className="freq-display">
                            <span className="freq-value" id="test-freq-value">1000</span><span className="freq-unit">Hz</span>
                            <span className="freq-desc" id="test-freq-desc">Âm trung</span>
                        </div>
                        <div className="current-db-display">
                            <span className="db-value" id="current-db-value">30</span>
                            <span className="db-unit">dB HL</span>
                        </div>
                        <div className="sound-wave" id="pulse-indicator">
                            <div className="wave-bar"></div><div className="wave-bar"></div><div className="wave-bar"></div><div className="wave-bar"></div><div className="wave-bar"></div>
                        </div>
                        <p className="test-status" id="test-status-text">Chuẩn bị phát âm thanh...</p>
                        <button className="btn btn-hear btn-lg" id="btn-hear">🔔 Tôi Nghe Thấy!</button>
                        <p className="test-hint">Nhấn nút ngay khi bạn nghe được âm thanh, dù rất nhỏ</p>
                        <div className="test-reminder-box">
                            <span className="test-reminder-icon">💡</span>
                            <span className="test-reminder-text"><strong>Nhắc nhở:</strong> Sử dụng tai nghe, ngồi trong môi trường yên tĩnh. Bạn có thể nhắm mắt lại để tập trung lắng nghe khách quan hơn.</span>
                        </div>
                        <div className="ear-transition-overlay" id="ear-transition" style={{ display: "none" }}>
                            <div className="ear-transition-content">
                                <div className="ear-transition-icon">👂</div>
                                <h3 id="ear-transition-title">Chuyển sang Tai Trái</h3>
                                <p>Chuẩn bị kiểm tra tai còn lại</p>
                                <button className="btn btn-primary" id="btn-continue-ear">Tiếp tục →</button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SCREEN 4: EVALUATION */}
                <section className="screen" id="screen-evaluation">
                    <div className="card fade-in">
                        <div className="eval-badge"><span className="eval-emoji" id="eval-emoji">✅</span></div>
                        <h2>Kết Quả Sơ Bộ</h2>
                        <div className="eval-result-card" id="eval-result-card">
                            <span className="eval-level" id="eval-level">Thính lực bình thường</span>
                            <p className="eval-desc" id="eval-desc">Thính lực nằm trong giới hạn bình thường.</p>
                        </div>
                        <div className="eval-ears">
                            <div className="eval-ear-card"><span className="eval-ear-label right-label">Tai Phải</span><span className="eval-ear-value" id="eval-right-avg">--</span><span className="eval-ear-status" id="eval-right-status">--</span></div>
                            <div className="eval-ear-card"><span className="eval-ear-label left-label">Tai Trái</span><span className="eval-ear-value" id="eval-left-avg">--</span><span className="eval-ear-status" id="eval-left-status">--</span></div>
                        </div>
                        <button className="btn btn-primary btn-lg" id="btn-view-details">Xem Kết Quả Chi Tiết →</button>
                    </div>
                </section>

                {/* SCREEN 5: USER INFO */}
                <section className="screen" id="screen-userinfo">
                    <div className="card fade-in">
                        <h2>📋 Thông Tin Của Bạn</h2>
                        <p className="subtitle">Điền thông tin để nhận kết quả thính lực đồ chi tiết</p>
                        <form id="form-userinfo" noValidate>
                            <div className="form-group"><label htmlFor="input-name">Họ và tên <span className="required">*</span></label><input type="text" id="input-name" required placeholder="Nguyễn Văn A" autoComplete="name" /></div>
                            <div className="form-group"><label htmlFor="input-email">Email <span className="required">*</span></label><input type="email" id="input-email" required placeholder="email@example.com" autoComplete="email" /></div>
                            <div className="form-group"><label htmlFor="input-phone">Số điện thoại <span className="required">*</span></label><input type="tel" id="input-phone" required placeholder="0901 234 567" autoComplete="tel" /></div>
                            <button type="submit" className="btn btn-primary btn-lg">Xem Thính Lực Đồ →</button>
                        </form>
                        <div className="form-loading" id="form-loading" style={{ display: "none" }}>
                            <div className="spinner"></div><p>Đang gửi thông tin...</p>
                        </div>
                    </div>
                </section>

                {/* SCREEN 6: AUDIOGRAM */}
                <section className="screen" id="screen-audiogram">
                    <div className="card wide-card fade-in">
                        <h2>📊 Thính Lực Đồ (Audiogram)</h2>
                        <p className="subtitle">Biểu đồ ngưỡng nghe kèm vùng &quot;Speech Banana&quot; minh hoạ tần số lời nói</p>
                        <div className="audiogram-wrapper"><canvas id="audiogram-canvas"></canvas></div>
                        <div className="audiogram-legend">
                            <div className="legend-item"><span className="legend-marker right-marker">○</span> Tai phải</div>
                            <div className="legend-item"><span className="legend-marker left-marker">✕</span> Tai trái</div>
                            <div className="legend-item"><span className="legend-marker banana-marker">🍌</span> Vùng lời nói</div>
                        </div>
                        <div className="severity-legend" id="severity-legend"></div>
                        <div className="section-block">
                            <h3>🗣️ Đánh Giá Khả Năng Giao Tiếp</h3>
                            <div className="assessment-grid" id="communication-assessment"></div>
                        </div>
                        <div className="section-block">
                            <h3>⚕️ Cảnh Báo Lâm Sàng</h3>
                            <div className="warnings-list" id="clinical-warnings"></div>
                        </div>
                        {/* Dashboard CTA for logged in users */}
                        {user && (
                            <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 14, padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
                                <span style={{ fontSize: 24 }}>✅</span>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#10b981" }}>Kết quả đã được lưu vào tài khoản của bạn!</div>
                                    <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2 }}>Xem và so sánh với các lần đo trước trong Dashboard.</div>
                                </div>
                                <a href="/dashboard" style={{ marginLeft: "auto", whiteSpace: "nowrap", padding: "8px 14px", background: "#10b981", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, textDecoration: "none", fontSize: "0.8rem", flexShrink: 0 }}>
                                    📊 Dashboard
                                </a>
                            </div>
                        )}
                        <div className="expert-cta">
                            <img src="https://vuinghe.com/wp-content/uploads/2022/01/Untitled-1-01-1-1.png" alt="Ths. Chu Đức Hải" className="expert-avatar-sm" />
                            <div>
                                <p className="expert-cta-text"><strong>Miễn phí</strong> đo thính lực chuyên sâu &amp; tư vấn cùng <strong>Ths. Chu Đức Hải</strong></p>
                                <p className="expert-cta-sub">Nguyên Trưởng VP Siemens Hearing VN • Sáng lập Phúc An Hearing</p>
                            </div>
                        </div>
                        <button className="btn btn-primary btn-lg" id="btn-book-appointment">📅 Đặt Lịch Khám Tại Phúc An Hearing</button>
                        <a href="https://zalo.me/818788000" target="_blank" rel="noopener noreferrer" className="btn btn-zalo btn-lg">💬 Nhắn Zalo Tư Vấn Ngay</a>
                    </div>
                </section>

                {/* SCREEN 7: BOOKING */}
                <section className="screen" id="screen-booking">
                    <div className="card fade-in">
                        <h2>📅 Đặt Lịch Khám</h2>
                        <p className="subtitle">Đặt lịch đo thính lực chuyên sâu tại Phúc An Hearing</p>
                        <div className="clinic-card">
                            <div className="clinic-icon">🏥</div>
                            <div>
                                <h3>Trợ Thính Phúc An Hearing (PAH)</h3>
                                <p>Chuyên gia: <strong>Ths. Chu Đức Hải</strong> — ĐHBK Hà Nội</p>
                                <p>📞 Hotline: <a href="tel:0818788000">0818 788 000</a></p>
                                <p>🌐 <a href="https://vuinghe.com" target="_blank" rel="noopener noreferrer">vuinghe.com</a></p>
                                <div className="clinic-social">
                                    <a href="https://zalo.me/818788000" target="_blank" rel="noopener noreferrer" className="social-link zalo">💬 Zalo</a>
                                    <a href="https://www.facebook.com/ths.chu.duc.hai/" target="_blank" rel="noopener noreferrer" className="social-link fb">📘 Facebook</a>
                                    <a href="https://www.youtube.com/@maytrothinhcaocap" target="_blank" rel="noopener noreferrer" className="social-link yt">▶️ YouTube</a>
                                </div>
                            </div>
                        </div>
                        <form id="form-booking">
                            <div className="form-row">
                                <div className="form-group"><label htmlFor="input-date">Ngày <span className="required">*</span></label><input type="date" id="input-date" required /></div>
                                <div className="form-group"><label htmlFor="input-time">Giờ <span className="required">*</span></label><input type="time" id="input-time" required min="08:00" max="17:00" /></div>
                            </div>
                            <div className="form-group"><label htmlFor="input-notes">Ghi chú</label><textarea id="input-notes" rows="3" placeholder="Mô tả triệu chứng..."></textarea></div>
                            <button type="submit" className="btn btn-primary btn-lg">✓ Xác Nhận Đặt Lịch</button>
                        </form>
                        <div className="booking-loading" id="booking-loading" style={{ display: "none" }}>
                            <div className="spinner"></div><p>Đang xử lý...</p>
                        </div>
                        <div className="booking-success" id="booking-success" style={{ display: "none" }}>
                            <div className="success-icon-big">✅</div>
                            <h3>Đặt Lịch Thành Công!</h3>
                            <p>Chúng tôi sẽ liên hệ xác nhận.</p>
                            <div className="booking-summary" id="booking-summary"></div>
                        </div>
                    </div>
                </section>

                {/* SCREEN 8: ADMIN LOGIN */}
                <section className="screen" id="screen-admin-login">
                    <div className="card fade-in">
                        <h2>🔒 Quản Trị Hệ Thống</h2>
                        <p className="subtitle">Vui lòng nhập mật khẩu để tiếp tục</p>
                        <form id="form-admin-login">
                            <div className="form-group">
                                <label htmlFor="input-admin-pwd">Mật khẩu</label>
                                <input type="password" id="input-admin-pwd" required placeholder="Nhập mật khẩu..." />
                            </div>
                            <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }}>Đăng Nhập</button>
                            <button type="button" className="btn btn-outline btn-lg btn-admin-back" style={{ width: "100%", marginTop: 10 }}>Quay lại Trang chủ</button>
                        </form>
                    </div>
                </section>

                {/* SCREEN 9: ADMIN DASHBOARD */}
                <section className="screen" id="screen-admin-dashboard">
                    <div className="card wide-card fade-in admin-dashboard">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                            <h2>⚙️ Quản Trị Hệ Thống</h2>
                            <button type="button" className="btn btn-outline btn-sm btn-admin-back">🚪 Thoát</button>
                        </div>
                        <div className="admin-tabs">
                            <button className="admin-tab active" data-target="admin-pane-settings">🛠 Cài đặt Hệ thống</button>
                            <button className="admin-tab" data-target="admin-pane-data">📊 Dữ liệu Lượt Đo &amp; Đặt Lịch</button>
                        </div>
                        <div className="admin-pane active" id="admin-pane-settings">
                            <form id="form-admin-settings">
                                <div className="section-block">
                                    <h3>🔊 Tần số kiểm tra (Hz)</h3>
                                    <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>Chọn các tần số muốn kiểm tra:</p>
                                    <div className="freq-checkboxes">
                                        {[250, 500, 1000, 2000, 4000, 8000].map((f) => (
                                            <label className="freq-cb-label" key={f}><input type="checkbox" className="freq-cb" id={`freq-${f}`} defaultValue={f} /> {f}</label>
                                        ))}
                                    </div>
                                </div>
                                <div className="section-block">
                                    <h3>⏱ Thông số Hughson-Westlake</h3>
                                    <div className="form-row">
                                        <div className="form-group"><label htmlFor="setting-pulse-count">Số lần phát âm</label><input type="number" id="setting-pulse-count" defaultValue="3" min="1" max="10" /></div>
                                        <div className="form-group"><label htmlFor="setting-pulse-duration">Thời lượng âm (ms)</label><input type="number" id="setting-pulse-duration" defaultValue="250" min="50" max="1000" /></div>
                                        <div className="form-group"><label htmlFor="setting-wait-duration">Thời gian chờ (ms)</label><input type="number" id="setting-wait-duration" defaultValue="1500" min="500" max="5000" /></div>
                                    </div>
                                </div>
                                <button type="submit" className="btn btn-primary btn-lg">💾 Lưu Cấu Hình</button>
                            </form>
                        </div>
                        <div className="admin-pane" id="admin-pane-data">
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
                                <span style={{ fontSize: 14, color: "#64748b" }}>Dữ liệu từ Google Sheets.</span>
                                <button type="button" className="btn btn-sm btn-outline" id="btn-admin-refresh">🔄 Tải Lại</button>
                            </div>
                            <h3>📊 Kết Quả Đo Mới Nhất</h3>
                            <div className="table-responsive">
                                <table className="admin-table">
                                    <thead><tr><th>Thời gian</th><th>Khách hàng</th><th>Email</th><th>Đánh giá</th><th>Chi tiết</th></tr></thead>
                                    <tbody id="admin-tbody-tests"></tbody>
                                </table>
                            </div>
                            <h3 style={{ marginTop: 40 }}>📅 Lịch Đặt Khám Gần Đây</h3>
                            <div className="table-responsive">
                                <table className="admin-table">
                                    <thead><tr><th>Thời gian đặt</th><th>Lịch hẹn</th><th>Khách hàng</th><th>Ghi chú</th><th>Đánh giá sơ bộ</th><th>Hành động</th></tr></thead>
                                    <tbody id="admin-tbody-bookings"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* Footer */}
            <footer className="app-footer">
                <div className="footer-brand">Phúc An Hearing (PAH)</div>
                <p className="footer-tagline">&quot;An Tâm Trọn Vẹn Hành Trình Nghe&quot;</p>
                <p className="footer-expert">Sáng lập: Ths. Chu Đức Hải — Thạc sĩ Y Sinh Học ĐHBK Hà Nội</p>
                <div className="footer-links">
                    <a href="https://vuinghe.com" target="_blank" rel="noopener noreferrer">🌐 vuinghe.com</a>
                    <a href="https://zalo.me/818788000" target="_blank" rel="noopener noreferrer">💬 Zalo</a>
                    <a href="https://www.facebook.com/ths.chu.duc.hai/" target="_blank" rel="noopener noreferrer">📘 Facebook</a>
                    <a href="tel:0818788000">📞 0818 788 000</a>
                </div>
                <p className="footer-copy">© 2026 Phúc An Hearing. Công cụ sàng lọc — không thay thế khám chuyên khoa.</p>
            </footer>
        </>
    );
}
