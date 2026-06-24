import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileText, HeartPulse, ShieldCheck, Siren } from "lucide-react";

const CONTENT = {
  terms: {
    title: "Terms of Service",
    icon: FileText,
    sections: [
      ["Platform role", "SevaSetu helps patients discover and book home nursing services. The platform coordinates requests, verification status, notifications, and visit tracking."],
      ["User responsibility", "Patients must provide accurate health, address, and contact information. Nurses must provide truthful credentials and work within their professional scope."],
      ["Service limits", "Acceptance, visit timing, and completion depend on nurse availability, admin review, safety review, and correct OTP verification."],
      ["Account action", "SevaSetu may suspend accounts, requests, or nurse availability where safety, fraud, abuse, or inaccurate documents are suspected."],
    ],
  },
  privacy: {
    title: "Privacy Policy",
    icon: ShieldCheck,
    sections: [
      ["Data collected", "We collect account details, contact details, service request details, uploaded documents, location data where permitted, ratings, safety reports, and notifications."],
      ["Use of data", "Data is used for booking, nurse matching, admin review, safety handling, notifications, support, fraud prevention, and service improvement."],
      ["Sensitive data", "Health descriptions and identity documents are treated as sensitive. Access should be limited to the user, assigned nurse, and authorized admin workflows."],
      ["Security", "Passwords are hashed and API access uses authentication. Do not share OTPs except with the assigned nurse during the actual visit."],
    ],
  },
  medical: {
    title: "Medical Disclaimer",
    icon: HeartPulse,
    sections: [
      ["Not a doctor replacement", "SevaSetu and its AI assistant do not replace a licensed doctor, emergency service, diagnosis, or prescription."],
      ["AI output", "AI responses are supportive guidance only. A qualified medical professional should review urgent, complex, or medication-related decisions."],
      ["Nursing scope", "Nurses must follow lawful nursing scope, doctor instructions, and safe clinical practice. Unsafe medicine or dosage advice should not be followed."],
      ["Emergency escalation", "For chest pain, severe breathlessness, stroke signs, heavy bleeding, unconsciousness, seizures, or other emergencies, call local emergency services immediately."],
    ],
  },
  emergency: {
    title: "Emergency Disclaimer",
    icon: Siren,
    sections: [
      ["Emergency care", "SevaSetu is not an ambulance service or emergency hospital. It may not be suitable for life-threatening situations."],
      ["Immediate action", "If a patient may be in danger, contact local emergency services, a nearby hospital, or the treating doctor immediately."],
      ["SOS feature", "The in-app SOS feature alerts admins and related users inside the platform, but it does not guarantee police, ambulance, or hospital dispatch."],
      ["Location accuracy", "ETA and location features depend on device permissions, network quality, and submitted address accuracy."],
    ],
  },
};

export default function LegalPage() {
  const { page = "terms" } = useParams();
  const content = CONTENT[page] || CONTENT.terms;
  const Icon = content.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <Link to="/home" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-800">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-950">{content.title}</h1>
            <p className="mt-1 text-sm text-gray-500">Last updated: May 2026</p>
          </div>
        </div>

        <div className="space-y-5">
          {content.sections.map(([heading, text]) => (
            <section key={heading} className="rounded-lg border border-gray-200 bg-white p-5">
              <h2 className="text-base font-semibold text-gray-950">{heading}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">{text}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
