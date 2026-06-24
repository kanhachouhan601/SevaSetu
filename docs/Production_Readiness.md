# SevaSetu Production Readiness

## Code-Level Production Base Done

- Backend rejects production deploys with missing `MONGODB_URI`, `JWT_SECRET`, or `FRONTEND_URL`.
- Backend rejects placeholder or short `JWT_SECRET` values in production.
- CORS supports `FRONTEND_URL` plus optional comma-separated `ALLOWED_ORIGINS`.
- API responses include basic security headers.
- Uploads are restricted by MIME type and extension for JPG, PNG, WEBP, and PDF.
- Upload size limits are configurable through environment variables.
- JWT lifetime is configurable with `JWT_EXPIRES_IN`.
- Frontend pages are lazy-loaded to reduce initial bundle size.
- Frontend has a route-level error boundary.
- MongoDB models have indexes for common dashboard, request, notification, safety, and audit queries.
- Root README, docs paths, package names, and ignore rules are aligned with `frontend/` and `backend/`.

## External Services Required For Real Production

| Area | External service/account needed | Why |
|---|---|---|
| Database | MongoDB Atlas paid/shared production cluster | Managed backups, uptime, monitoring, access controls |
| File storage | S3, Cloudinary, Firebase Storage, or similar | Local Render disk is not reliable for medical documents |
| SMS/WhatsApp OTP | Twilio, MSG91, Gupshup, Interakt, or WhatsApp Business provider | Real patient/nurse verification and visit alerts |
| Email | Gmail app password for pilot, SendGrid/Mailgun/Amazon SES for production | Reliable transactional email |
| Payments | Razorpay, Stripe, Cashfree, or PayU | Booking/payment collection and settlement |
| Monitoring | Sentry plus Render/Vercel logs, or equivalent | Error visibility and incident response |
| Uptime checks | Better Stack, UptimeRobot, or equivalent | Detect backend/frontend downtime |
| Analytics/audit export | PostHog, GA4, or custom warehouse | Product usage and compliance reporting |
| Security review | Manual security audit or pentest | Required before public healthcare launch |
| Legal/medical review | Privacy policy, consent text, SOPs, emergency process | Required before real healthcare operations |

## Remaining Before Public Launch

- Move uploads from local disk to cloud object storage.
- Add real SMS/WhatsApp OTP for login/visit confirmation.
- Add payment gateway and refund/settlement flow.
- Add integration tests for auth, booking, admin approval, nurse accept, OTP, SOS, and rating.
- Add frontend workflow tests for patient, nurse, and admin dashboards.
- Add production monitoring, alerting, and backup checks.
- Complete legal/privacy/consent/SOP review.
- Run a security audit before onboarding real patients.

## Practical Launch Level

- Demo/CMHO submission: ready after env setup and final manual flow testing.
- Controlled pilot: possible after cloud storage, SMS/WhatsApp OTP, monitoring, and backup setup.
- Public healthcare launch: requires all remaining items plus legal and security review.
