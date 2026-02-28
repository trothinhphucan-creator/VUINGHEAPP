import { Resend } from "resend";

export const dynamic = 'force-dynamic';

export async function POST(req) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const CLINIC_EMAIL = process.env.CLINIC_EMAIL || "phucan.hearing@vuinghe.com";
    try {
        const booking = await req.json();

        // Basic validation
        if (!booking.name || !booking.phone) {
            return Response.json({ error: "Missing name or phone" }, { status: 400 });
        }

        const dateFormatted = booking.preferredDate
            ? new Date(booking.preferredDate).toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
            : "Chưa xác định";
        const timeStr = booking.preferredTime || "Linh hoạt";

        // 1. Notify clinic
        await resend.emails.send({
            from: "PAH Booking <booking@vuinghe.com>",
            to: [CLINIC_EMAIL],
            subject: `📅 Lịch hẹn mới — ${booking.name} (${booking.phone})`,
            html: `
                <h2 style="color:#0f4c75">Có lịch hẹn mới!</h2>
                <table style="border-collapse:collapse;width:100%;font-family:sans-serif">
                    <tr><td style="padding:8px;font-weight:bold;color:#555">Họ tên</td><td style="padding:8px">${booking.name}</td></tr>
                    <tr style="background:#f9f9f9"><td style="padding:8px;font-weight:bold;color:#555">Điện thoại</td><td style="padding:8px"><a href="tel:${booking.phone}">${booking.phone}</a></td></tr>
                    <tr><td style="padding:8px;font-weight:bold;color:#555">Email</td><td style="padding:8px">${booking.email || "—"}</td></tr>
                    <tr style="background:#f9f9f9"><td style="padding:8px;font-weight:bold;color:#555">Ngày hẹn</td><td style="padding:8px">${dateFormatted}</td></tr>
                    <tr><td style="padding:8px;font-weight:bold;color:#555">Khung giờ</td><td style="padding:8px">${timeStr}</td></tr>
                    <tr style="background:#f9f9f9"><td style="padding:8px;font-weight:bold;color:#555">Nguồn</td><td style="padding:8px">${booking.source === "post_test" ? "Sau đo thính lực" : "Web"}</td></tr>
                    <tr><td style="padding:8px;font-weight:bold;color:#555">Ghi chú</td><td style="padding:8px">${booking.note || "—"}</td></tr>
                </table>
                <p style="margin-top:20px;color:#888;font-size:12px">
                    Xem chi tiết trong <a href="https://hearingtest.pah.vn/admin">Admin Dashboard</a>
                </p>
            `,
        });

        // 2. Confirm to patient (if email provided)
        if (booking.email) {
            await resend.emails.send({
                from: "Phúc An Hearing <booking@vuinghe.com>",
                to: [booking.email],
                subject: "✅ Xác nhận đặt lịch hẹn — Phúc An Hearing",
                html: `
                    <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
                        <h2 style="color:#0f4c75">Đặt lịch thành công!</h2>
                        <p>Xin chào <strong>${booking.name}</strong>,</p>
                        <p>Phúc An Hearing đã nhận được yêu cầu đặt lịch của bạn. Chúng tôi sẽ liên hệ xác nhận trong thời gian sớm nhất.</p>
                        <div style="background:#f0f7ff;border-radius:8px;padding:16px;margin:20px 0">
                            <p style="margin:4px 0"><strong>📅 Ngày hẹn:</strong> ${dateFormatted}</p>
                            <p style="margin:4px 0"><strong>🕐 Khung giờ:</strong> ${timeStr}</p>
                        </div>
                        <p>Nếu cần hỗ trợ ngay, vui lòng liên hệ:</p>
                        <ul>
                            <li>📞 Hotline: <a href="tel:0818788000">0818 788 000</a></li>
                            <li>💬 Zalo: <a href="https://zalo.me/818788000">zalo.me/818788000</a></li>
                        </ul>
                        <p style="color:#888;font-size:12px;margin-top:24px">
                            Phúc An Hearing (PAH) — Chuyên gia máy trợ thính<br>
                            <a href="https://vuinghe.com">vuinghe.com</a>
                        </p>
                    </div>
                `,
            });
        }

        return Response.json({ ok: true });
    } catch (err) {
        console.error("Notify booking error:", err);
        return Response.json({ error: "Failed to send notification" }, { status: 500 });
    }
}
