import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  User,
  Stethoscope,
  ArrowLeft,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import LanguageSelector from "../components/LanguageSelector";

const GoogleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const InputField = ({ icon: Icon, label, ...props }) => (
  <div className="space-y-1.5">
    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
      {Icon && <Icon className="h-3.5 w-3.5 text-gray-400" />}
      {label}
    </label>
    <input
      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
      {...props}
    />
  </div>
);

export default function HomePage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState("home"); // "home" | "patient" | "nurse"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Patient fields
  const [pName, setPName] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pEmail, setPEmail] = useState("");
  const [pAddress, setPAddress] = useState("");

  // Nurse fields
  const [nName, setNName] = useState("");
  const [nPhone, setNPhone] = useState("");
  const [nEmail, setNEmail] = useState("");

  async function handlePatientContinue() {
    if (!pName.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await login({ name: pName, phone: pPhone, email: pEmail, address: pAddress, role: "patient" });
      if (result?.role === "nurse") navigate("/nurse/dashboard");
      else navigate("/patient/dashboard");
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleNurseContinue() {
    if (!nName.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await login({ name: nName, phone: nPhone, email: nEmail, role: "nurse" });
      if (result?.role === "nurse") navigate("/nurse/dashboard");
      else navigate("/patient/dashboard");
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (mode === "patient") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-teal-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl bg-white shadow-xl border border-sky-100 overflow-hidden">
            <div className="bg-gradient-to-r from-sky-500 to-sky-600 px-8 pt-8 pb-6">
              <button
                onClick={() => { setMode("home"); setError(""); }}
                className="flex items-center gap-1.5 text-sky-100 hover:text-white text-sm mb-6 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                <User className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Welcome, Patient</h2>
              <p className="text-sky-100 text-sm mt-1">We're here to help you feel better 💙</p>
            </div>

            <div className="p-8 space-y-4">
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              <InputField label="Your Name *" placeholder="Rahul Sharma" value={pName} onChange={e => setPName(e.target.value)} />
              <InputField icon={Phone} label="Phone Number" placeholder="+91 98765 00000" value={pPhone} onChange={e => setPPhone(e.target.value)} type="tel" />
              <InputField icon={Mail} label="Gmail / Email" placeholder="rahul@gmail.com" value={pEmail} onChange={e => setPEmail(e.target.value)} type="email" />
              <InputField icon={MapPin} label="Address (optional)" placeholder="Flat 12, Sector 5, Noida" value={pAddress} onChange={e => setPAddress(e.target.value)} />

              <button
                onClick={handlePatientContinue}
                disabled={!pName.trim() || loading}
                className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Please wait…" : <>Continue <ChevronRight className="h-4 w-4" /></>}
              </button>

              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-gray-400 uppercase tracking-wide">or</span>
                </div>
              </div>

              <button className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50">
                <GoogleIcon /> Continue with Google
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "nurse") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-teal-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl bg-white shadow-xl border border-teal-100 overflow-hidden">
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-8 pt-8 pb-6">
              <button
                onClick={() => { setMode("home"); setError(""); }}
                className="flex items-center gap-1.5 text-teal-100 hover:text-white text-sm mb-6 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                <Stethoscope className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Nurse Portal</h2>
              <p className="text-teal-100 text-sm mt-1">Sign in to your verified nurse account</p>
            </div>

            <div className="p-8 space-y-4">
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              <InputField label="Your Name *" placeholder="Priya Sharma" value={nName} onChange={e => setNName(e.target.value)} />
              <InputField icon={Phone} label="Phone Number" placeholder="+91 98765 00001" value={nPhone} onChange={e => setNPhone(e.target.value)} type="tel" />
              <InputField icon={Mail} label="Gmail / Email *" placeholder="nurse@gmail.com" value={nEmail} onChange={e => setNEmail(e.target.value)} type="email" />

              <button
                onClick={handleNurseContinue}
                disabled={!nName.trim() || loading}
                className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Please wait…" : <>Continue <ChevronRight className="h-4 w-4" /></>}
              </button>

              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-gray-400 uppercase tracking-wide">or</span>
                </div>
              </div>

              <button className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50">
                <GoogleIcon /> Continue with Google
              </button>

              <button
                onClick={() => navigate("/register")}
                className="w-full rounded-xl border border-teal-200 px-4 py-3 text-sm font-medium text-teal-600 transition hover:bg-teal-50"
              >
                New Nurse? Register Here
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Home view
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-teal-50 flex flex-col items-center justify-center p-6">
      <div className="absolute right-4 top-4">
        <LanguageSelector compact />
      </div>
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="flex items-center justify-center mb-5">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center shadow-lg shadow-sky-200">
            <Heart className="h-9 w-9 text-white fill-white" />
          </div>
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">NurseConnect</h1>
        <p className="text-gray-500 mt-2 text-lg">India's trusted home nursing platform</p>
        <span className="mt-3 inline-block rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
          🇮🇳 Serving patients across India
        </span>
      </div>

      {/* Role buttons */}
      <div className="w-full max-w-md space-y-4">
        {/* Patient button */}
        <button
          onClick={() => setMode("patient")}
          className="group w-full text-left rounded-2xl bg-white border-2 border-transparent shadow-md transition-all duration-200 hover:border-sky-400 hover:shadow-xl hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-5 p-6">
            <div className="h-14 w-14 rounded-2xl bg-sky-100 flex items-center justify-center shrink-0 transition-colors group-hover:bg-sky-200">
              <User className="h-7 w-7 text-sky-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg text-gray-900">I'm a Patient</p>
              <p className="text-sm text-gray-500">Book a nurse, get care at home</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 transition-all group-hover:text-sky-500 group-hover:translate-x-1" />
          </div>
        </button>

        {/* Nurse button */}
        <button
          onClick={() => setMode("nurse")}
          className="group w-full text-left rounded-2xl bg-white border-2 border-transparent shadow-md transition-all duration-200 hover:border-teal-400 hover:shadow-xl hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-5 p-6">
            <div className="h-14 w-14 rounded-2xl bg-teal-100 flex items-center justify-center shrink-0 transition-colors group-hover:bg-teal-200">
              <Stethoscope className="h-7 w-7 text-teal-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg text-gray-900">I'm a Nurse</p>
              <p className="text-sm text-gray-500">Sign in, accept requests, earn</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 transition-all group-hover:text-teal-500 group-hover:translate-x-1" />
          </div>
        </button>
      </div>

      {/* Stats */}
      <div className="mt-12 flex items-center gap-8">
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900">3 Lakh+</p>
          <p className="text-xs text-gray-500 mt-0.5">Nurses</p>
        </div>
        <div className="h-8 w-px bg-gray-200" />
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900">1 Lakh+</p>
          <p className="text-xs text-gray-500 mt-0.5">Patients</p>
        </div>
        <div className="h-8 w-px bg-gray-200" />
        <div className="text-center">
          <p className="text-xl font-bold text-gray-900">98%</p>
          <p className="text-xs text-gray-500 mt-0.5">Satisfaction</p>
        </div>
      </div>

      {/* Bottom links */}
      <div className="mt-8 flex items-center gap-4 text-sm text-gray-500">
        <button onClick={() => navigate("/login")} className="hover:text-sky-600 transition-colors">
          Sign In
        </button>
        <span className="text-gray-300">·</span>
        <button onClick={() => navigate("/register")} className="hover:text-teal-600 transition-colors">
          Register
        </button>
      </div>
    </div>
  );
}
