// src/controllers/email.controller.js
// ============================================================
// Nodemailer Gmail SMTP — nurse approval & booking confirmation
// ============================================================

const nodemailer = require('nodemailer');

const createTransporter = () => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    throw new Error('Gmail credentials not configured. Set GMAIL_USER and GMAIL_PASS in .env');
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });
};

// ─── HTML Email Templates ─────────────────────────────────────

const nurseApprovalTemplate = ({ nurseName, nurseEmail, appUrl }) => ({
  subject: '🎉 Congratulations! Your NurseConnect Profile is Approved',
  html: `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8" /><style>
      body { font-family: Arial, sans-serif; background: #f4f7fb; margin: 0; padding: 20px; }
      .card { background: #fff; border-radius: 12px; max-width: 580px; margin: auto; padding: 28px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
      .header { background: linear-gradient(135deg, #0f766e, #0ea5e9); border-radius: 8px; padding: 18px 22px; margin-bottom: 22px; }
      .header h1 { color: #fff; margin: 0; font-size: 20px; }
      .header p { color: #e0f2fe; margin: 6px 0 0; font-size: 13px; }
      .body { font-size: 15px; color: #374151; line-height: 1.7; }
      .btn { display: inline-block; margin-top: 20px; padding: 13px 32px; background: #0f766e; color: #fff !important; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; }
      .footer { margin-top: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
    </style></head>
    <body>
      <div class="card">
        <div class="header">
          <h1>🏥 NurseConnect — Profile Approved!</h1>
          <p>Congratulations! You're now a verified NurseConnect nurse.</p>
        </div>
        <div class="body">
          <p>Dear <strong>${nurseName}</strong>,</p>
          <p>We are thrilled to inform you that your NurseConnect nurse profile has been <strong>approved</strong> by our medical team!</p>
          <p>You can now:</p>
          <ul>
            <li>✅ Receive patient service requests</li>
            <li>✅ Accept or decline home visits</li>
            <li>✅ Earn through our platform</li>
          </ul>
          <p>Please log in to your nurse portal to update your availability and start accepting requests.</p>
          <a href="${appUrl}/nurse-portal" class="btn">🩺 Go to Nurse Portal →</a>
        </div>
        <div class="footer">
          NurseConnect — India's Trusted Home Healthcare Platform<br />
          © ${new Date().getFullYear()} NurseConnect
        </div>
      </div>
    </body>
    </html>
  `,
});

const bookingConfirmationTemplate = ({ patientName, phone, address, problem, aiSummary, mode, nurseEmails, appUrl }) => ({
  subject: `🏥 Naya Request: ${patientName} — ${mode === 'temporary' ? 'Urgent Visit' : 'Long-term Care'}`,
  html: `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8" /><style>
      body { font-family: Arial, sans-serif; background: #f4f7fb; margin: 0; padding: 20px; }
      .card { background: #fff; border-radius: 12px; max-width: 580px; margin: auto; padding: 28px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
      .header { background: linear-gradient(135deg, #0f766e, #0ea5e9); border-radius: 8px; padding: 18px 22px; margin-bottom: 22px; }
      .header h1 { color: #fff; margin: 0; font-size: 20px; }
      .header p { color: #e0f2fe; margin: 6px 0 0; font-size: 13px; }
      .row { margin-bottom: 14px; border-bottom: 1px solid #f3f4f6; padding-bottom: 14px; }
      .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 3px; }
      .value { font-size: 15px; color: #111827; font-weight: 500; }
      .badge { display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
      .badge-temp { background: #fef3c7; color: #d97706; }
      .badge-long { background: #dbeafe; color: #1d4ed8; }
      .ai-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; white-space: pre-wrap; font-size: 13px; color: #166534; line-height: 1.6; }
      .btn { display: inline-block; margin-top: 20px; padding: 13px 32px; background: #0f766e; color: #fff !important; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; }
      .footer { margin-top: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
    </style></head>
    <body>
      <div class="card">
        <div class="header">
          <h1>🏥 NurseConnect — Naya Patient Request</h1>
          <p>Ek patient ne aapki seva maangi hai. Neeche poori details hain.</p>
        </div>
        <div class="row"><div class="label">Patient Ka Naam</div><div class="value">👤 ${patientName}</div></div>
        <div class="row"><div class="label">Phone Number</div><div class="value">📞 ${phone || 'N/A'}</div></div>
        <div class="row"><div class="label">Address</div><div class="value">📍 ${address || 'N/A'}</div></div>
        <div class="row">
          <div class="label">Seva Ka Prakar</div>
          <div class="value">
            <span class="badge ${mode === 'temporary' ? 'badge-temp' : 'badge-long'}">
              ${mode === 'temporary' ? '⚡ Temporary / Ek-baar Visit' : '📅 Long-term Care'}
            </span>
          </div>
        </div>
        <div class="row"><div class="label">Patient Ki Samasya</div><div class="value">${problem}</div></div>
        ${aiSummary ? `<div class="row"><div class="label">🤖 AI Analysis</div><div class="ai-box">${aiSummary}</div></div>` : ''}
        <div style="text-align:center; padding-top: 8px;">
          <a href="${appUrl}/nurse-portal" class="btn">🩺 Nurse Portal Mein Accept Karen →</a>
        </div>
        <div class="footer">
          Yeh email NurseConnect platform se automatically bheja gaya hai.<br/>
          © ${new Date().getFullYear()} NurseConnect — Home Healthcare Platform
        </div>
      </div>
    </body>
    </html>
  `,
});

// ─── POST /api/email/send ─────────────────────────────────────
const sendEmail = async (req, res) => {
  try {
    const {
      type,              // 'nurse_approval' | 'booking_confirmation' | 'custom'
      to,                // string or string[]
      patientName,
      phone,
      address,
      problem,
      aiSummary,
      mode,
      nurseName,
      subject,
      htmlBody,
      textBody,
    } = req.body;

    const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const recipients = Array.isArray(to) ? to : [to];

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ error: 'At least one recipient email is required.' });
    }

    let emailSubject, emailHtml, emailText;

    if (type === 'nurse_approval') {
      const tmpl = nurseApprovalTemplate({ nurseName: nurseName || 'Nurse', nurseEmail: recipients[0], appUrl });
      emailSubject = tmpl.subject;
      emailHtml = tmpl.html;
      emailText = `Congratulations ${nurseName}! Your NurseConnect profile has been approved. Login at ${appUrl}/nurse-portal`;
    } else if (type === 'booking_confirmation') {
      if (!patientName || !problem) {
        return res.status(400).json({ error: 'patientName and problem are required for booking emails.' });
      }
      const tmpl = bookingConfirmationTemplate({ patientName, phone, address, problem, aiSummary, mode, nurseEmails: recipients, appUrl });
      emailSubject = tmpl.subject;
      emailHtml = tmpl.html;
      emailText = `NurseConnect - Naya Patient Request\n\nPatient: ${patientName}\nPhone: ${phone}\nAddress: ${address}\nMode: ${mode}\nProblem: ${problem}\n\n${aiSummary || ''}`;
    } else {
      // Custom email
      if (!subject || (!htmlBody && !textBody)) {
        return res.status(400).json({ error: 'For custom emails, subject and htmlBody or textBody are required.' });
      }
      emailSubject = subject;
      emailHtml = htmlBody;
      emailText = textBody;
    }

    const transporter = createTransporter();

    const result = await transporter.sendMail({
      from: `"NurseConnect" <${process.env.GMAIL_USER}>`,
      to: recipients.join(', '),
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
    });

    console.log('[Email Sent]', result.messageId, '| To:', recipients.length, 'recipients');

    res.json({
      success: true,
      messageId: result.messageId,
      sentTo: recipients.length,
    });
  } catch (error) {
    console.error('[Email Controller]', error);
    if (error.message.includes('not configured')) {
      return res.status(503).json({ error: error.message });
    }
    res.status(500).json({ error: 'Email sending failed. Check Gmail credentials.' });
  }
};

module.exports = { sendEmail };
