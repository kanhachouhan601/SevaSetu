import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import axios from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { loadInterviewReports } from "../utils/geminiInterview";

// ── Icons ────────────────────────────────────────────────────
const icons = {
  Home: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Users: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
  Stethoscope: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M4.8 2.3A.3.3 0 105 2H4a2 2 0 00-2 2v5a6 6 0 006 6v0a6 6 0 006-6V4a2 2 0 00-2-2h-1a.2.2 0 10.3.3"/>
      <path d="M8 15v1a6 6 0 006 6v0a6 6 0 006-6v-4"/><circle cx="20" cy="10" r="2"/>
    </svg>
  ),
  Activity: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Bell: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  ),
  LogOut: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  ),
  Heart: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  ),
  MapPin: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Rupee: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <path d="M6 3h12M6 8h12M6 13h8a4 4 0 000-8M10 21L6 13"/>
    </svg>
  ),
  Menu: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
};

// ── Badge components ─────────────────────────────────────────
function NurseBadge({ status }) {
  const map = {
    pending: "bg-amber-100 text-amber-700 border border-amber-200",
    approved: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    rejected: "bg-red-100 text-red-700 border border-red-200",
  };
  const label = { pending: "⏳ Pending", approved: "✅ Approved", rejected: "❌ Rejected" };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] || "bg-gray-100 text-gray-600 border border-gray-200"}`}>{label[status] || status}</span>;
}

function ReqBadge({ status }) {
  const map = {
    "pending-admin": "bg-purple-100 text-purple-700",
    pending: "bg-amber-100 text-amber-700",
    matched: "bg-blue-100 text-blue-700",
    "in-progress": "bg-sky-100 text-sky-700",
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
  };
  const emojis = { "pending-admin": "🛡️", pending: "⏳", matched: "🔗", "in-progress": "🚀", completed: "✅", cancelled: "❌" };
  return <span className={`text-xs px-2 py-0.5 rounded-full border border-transparent ${map[status] || "bg-gray-100 text-gray-600"}`}>{emojis[status]} {status?.replace("-", " ")}</span>;
}

function PatientBadge({ status }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status === "active" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
      {status === "active" ? "🟢 Active" : "⚪ Inactive"}
    </span>
  );
}

// ── Stat Card ────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color, onClick }) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow ${
        onClick ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-200" : ""
      }`}
    >
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        {icon}
      </div>
      <p className="text-2xl font-extrabold text-gray-900">{value ?? "—"}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </Wrapper>
  );
}

// ── Custom Tooltip ───────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-gray-900">{label}</p>
      <p className="text-teal-600">₹{Number(payload[0]?.value || 0).toLocaleString()}</p>
    </div>
  );
}

// ── MAIN ADMIN DASHBOARD ──────────────────────────────────────
const TABS = [
  { id: "dashboard", label: "Dashboard", Icon: icons.Home },
  { id: "nurses", label: "Nurses", Icon: icons.Stethoscope },
  { id: "patients", label: "Patients", Icon: icons.Users },
  { id: "requests", label: "Requests", Icon: icons.Activity },
  { id: "reports", label: "Interview Reports", Icon: icons.Activity },
  { id: "safety", label: "Safety", Icon: icons.Shield },
];

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Dashboard data
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Nurses
  const [nurses, setNurses] = useState([]);
  const [nurseFilter, setNurseFilter] = useState("all");
  const [nurseSearch, setNurseSearch] = useState("");
  const [loadingNurses, setLoadingNurses] = useState(false);
  const [nurseActionMsg, setNurseActionMsg] = useState(null);

  // Patients
  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);

  // Requests
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [safetyAlerts, setSafetyAlerts] = useState([]);
  const [loadingSafety, setLoadingSafety] = useState(false);
  const [interviewReports, setInterviewReports] = useState([]);
  const [expandedReportId, setExpandedReportId] = useState(null);

  // Fetch on mount
  useEffect(() => { fetchStats(); }, []);
  useEffect(() => {
    if (activeTab === "nurses") fetchNurses();
    else if (activeTab === "patients") fetchPatients();
    else if (activeTab === "requests") fetchRequests();
    else if (activeTab === "reports") fetchInterviewReports();
    else if (activeTab === "safety") fetchSafetyAlerts();
  }, [activeTab]);

  async function fetchStats() {
    setLoadingStats(true);
    try {
      const [statsRes, activityRes] = await Promise.all([
        axios.get("/api/admin/stats"),
        axios.get("/api/admin/activity"),
      ]);
      // ✅ FIX: Backend returns { success, stats } — not stats directly
      setStats(statsRes.data?.stats || statsRes.data || null);
      // ✅ FIX: Backend returns { success, activity } — not array directly
      setActivity(activityRes.data?.activity || activityRes.data || []);
    } catch {
      setStats(null);
      setActivity([]);
    } finally {
      setLoadingStats(false);
    }
  }

  async function fetchNurses() {
    setLoadingNurses(true);
    try {
      const res = await axios.get("/api/admin/nurses");
      // ✅ FIX: Backend returns { success, nurses, pagination }
      // Each nurse is a NurseProfile with populated userId
      const rawNurses = res.data?.nurses || [];
      // Flatten for display: merge profile + user data
      const mapped = rawNurses.map(n => ({
        _id: n._id,
        userId: n.userId?._id,
        // ✅ FIX: name/email come from populated userId, not top-level
        name: n.userId?.name || "Unknown",
        email: n.userId?.email || "",
        phone: n.userId?.phone || "",
        status: n.status,
        specializations: n.specializations || [],
        experience: n.experience ? `${n.experience} yrs` : null,
        location: [n.location?.city, n.location?.state].filter(Boolean).join(", ") || null,
        documents: n.documents,
        documentFiles: n.documentFiles,
        rating: n.rating,
        totalRatings: n.totalRatings,
        earnings: n.earnings,
        interviewScore: n.interviewScore,
        interviewFeedback: n.interviewFeedback,
        rejectionReason: n.rejectionReason,
      }));
      setNurses(mapped);
    } catch { setNurses([]); }
    finally { setLoadingNurses(false); }
  }

  async function fetchPatients() {
    setLoadingPatients(true);
    try {
      const res = await axios.get("/api/admin/patients");
      // ✅ FIX: Backend returns { success, patients, pagination }
      setPatients(res.data?.patients || []);
    } catch { setPatients([]); }
    finally { setLoadingPatients(false); }
  }

  async function verifyPatientAddress(id) {
    try {
      await axios.put(`/api/admin/patient/${id}/address-verify`);
      fetchPatients();
      fetchSafetyAlerts();
    } catch (err) {
      console.error("Verify patient address failed:", err?.response?.data?.error);
    }
  }

  async function clearPatientSafety(id) {
    try {
      await axios.put(`/api/admin/patient/${id}/safety-clear`);
      fetchPatients();
      fetchSafetyAlerts();
    } catch (err) {
      console.error("Clear patient safety failed:", err?.response?.data?.error);
    }
  }

  async function fetchRequests() {
    setLoadingRequests(true);
    try {
      const res = await axios.get("/api/admin/requests");
      // ✅ FIX: Backend returns { success, requests, pagination }
      // Each request has populated patientId and nurseId objects
      const rawReqs = res.data?.requests || [];
      const mapped = rawReqs.map(r => ({
        ...r,
        // ✅ FIX: patientId and nurseId are populated objects
        patientName: r.patientId?.name || "—",
        nurseName: r.nurseId?.name || "Unassigned",
      }));
      setRequests(mapped);
    } catch { setRequests([]); }
    finally { setLoadingRequests(false); }
  }

  async function approvePatientRequest(id) {
    try {
      await axios.put(`/api/admin/request/${id}/approve`);
      await Promise.all([fetchRequests(), fetchStats()]);
    } catch (err) {
      console.error("Approve request failed:", err?.response?.data?.error);
    }
  }

  async function rejectPatientRequest(id) {
    const reason = window.prompt("Reject reason", "Request could not be verified by admin.");
    if (reason === null) return;
    try {
      await axios.put(`/api/admin/request/${id}/reject`, { reason });
      await Promise.all([fetchRequests(), fetchStats()]);
    } catch (err) {
      console.error("Reject request failed:", err?.response?.data?.error);
    }
  }

  async function fetchSafetyAlerts() {
    setLoadingSafety(true);
    try {
      const res = await axios.get("/api/admin/safety-alerts?status=all");
      setSafetyAlerts(res.data?.alerts || []);
    } catch {
      setSafetyAlerts([]);
    } finally {
      setLoadingSafety(false);
    }
  }

  async function resolveSafetyAlert(id) {
    try {
      await axios.put(`/api/admin/safety-alert/${id}/resolve`, { note: "Reviewed by admin." });
      fetchSafetyAlerts();
    } catch (err) {
      console.error("Resolve safety alert failed:", err?.response?.data?.error);
    }
  }

  async function approveSafetyReview(requestId) {
    try {
      await axios.put(`/api/admin/request/${requestId}/safety-approve`);
      fetchSafetyAlerts();
    } catch (err) {
      console.error("Approve safety review failed:", err?.response?.data?.error);
    }
  }

  async function approveNurse(id) {
    setNurseActionMsg(null);
    try {
      const res = await axios.put(`/api/admin/nurse/${id}/approve`);
      setNurseActionMsg({ type: "success", text: res.data?.message || "Nurse approved successfully." });
      fetchNurses();
    } catch (err) {
      const text = err?.response?.data?.error || "Approve failed.";
      setNurseActionMsg({ type: "error", text });
      console.error("Approve failed:", text);
    }
  }

  function fetchInterviewReports() {
    setInterviewReports(loadInterviewReports());
    if (nurses.length === 0) fetchNurses();
  }

  function getReportNurseProfile(report) {
    return nurses.find(nurse => (
      nurse._id === report.nurseId ||
      nurse.userId === report.nurseId ||
      nurse.name === report.candidateName
    ));
  }

  async function approveReportNurse(report) {
    const profile = getReportNurseProfile(report);
    if (!profile?._id) {
      setNurseActionMsg({ type: "error", text: "Matching nurse profile not found. Open Nurses tab and approve manually." });
      return;
    }
    await approveNurse(profile._id);
    fetchInterviewReports();
  }

  async function rejectReportNurse(report) {
    const profile = getReportNurseProfile(report);
    if (!profile?._id) {
      setNurseActionMsg({ type: "error", text: "Matching nurse profile not found. Open Nurses tab and reject manually." });
      return;
    }
    await rejectNurse(profile._id);
    fetchInterviewReports();
  }

  async function rejectNurse(id) {
    setNurseActionMsg(null);
    try {
      const res = await axios.put(`/api/admin/nurse/${id}/reject`, { reason: "Does not meet requirements." });
      setNurseActionMsg({ type: "success", text: res.data?.message || "Nurse rejected." });
      fetchNurses();
    } catch (err) {
      const text = err?.response?.data?.error || "Reject failed.";
      setNurseActionMsg({ type: "error", text });
      console.error("Reject failed:", text);
    }
  }

  function openNurses(filter = "all") {
    setNurseFilter(filter);
    setActiveTab("nurses");
  }

  //  FIX: nurse.name is now flattened correctly from fetchNurses
  const filteredNurses = nurses
    .filter(n => nurseFilter === "all" || n.status === nurseFilter)
    .filter(n => !nurseSearch ||
      n.name?.toLowerCase().includes(nurseSearch.toLowerCase()) ||
      n.location?.toLowerCase().includes(nurseSearch.toLowerCase()) ||
      n.email?.toLowerCase().includes(nurseSearch.toLowerCase())
    );

  const pendingCount = nurses.filter(n => n.status === "pending").length;

  // Sidebar nav
  const Sidebar = ({ mobile = false }) => (
    <nav className={`${mobile ? "space-y-1" : "space-y-0.5"}`}>
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === id
              ? "bg-teal-600 text-white shadow-md shadow-teal-900/30"
              : "text-gray-400 hover:bg-gray-800 hover:text-white"
          }`}
        >
          <Icon />
          {label}
          {id === "nurses" && pendingCount > 0 && (
            <span className="ml-auto h-5 min-w-5 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </button>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-56 bg-gray-900 min-h-screen p-4 sticky top-0">
        <div className="flex items-center gap-2.5 mb-8 px-1">
          <div className="h-9 w-9 rounded-xl bg-teal-600 flex items-center justify-center text-white">
            <icons.Heart />
          </div>
          <div>
            <p className="font-bold text-white leading-none text-sm">SevaSetu</p>
            <p className="text-[10px] text-teal-400 mt-0.5 uppercase tracking-wide">Admin Panel</p>
          </div>
        </div>

        <Sidebar />

        <div className="mt-auto pt-4 border-t border-gray-800">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-900/20 text-sm font-medium transition-colors"
          >
            <icons.LogOut /> Logout
          </button>
        </div>
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-56 bg-gray-900 p-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-teal-600 flex items-center justify-center text-white"><icons.Shield /></div>
                <p className="font-bold text-white text-sm">Admin</p>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white p-1">
                <icons.X />
              </button>
            </div>
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* ── Right Content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
          <div className="px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100">
                <icons.Menu />
              </button>
              <h1 className="font-bold text-gray-900 capitalize">
                {TABS.find(t => t.id === activeTab)?.label}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                <icons.Bell />
                {pendingCount > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
                )}
              </button>
              <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm">A</div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 space-y-5 overflow-auto">

          {/* ═══ DASHBOARD TAB ═══ */}
          {activeTab === "dashboard" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Overview</h2>
                <p className="text-sm text-gray-500">Platform health at a glance</p>
              </div>

              {loadingStats ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse h-24" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <StatCard icon={<icons.Stethoscope />} label="Total Nurses" value={stats?.totalNurses} sub={stats?.activeNurses ? `${stats.activeNurses} active` : null} color="bg-teal-50 text-teal-600" onClick={() => openNurses("all")} />
                  <StatCard icon={<icons.Stethoscope />} label="Active Nurses" value={stats?.activeNurses} color="bg-emerald-50 text-emerald-600" onClick={() => openNurses("approved")} />
                  <StatCard icon={<icons.Users />} label="Total Patients" value={stats?.totalPatients} color="bg-sky-50 text-sky-600" onClick={() => setActiveTab("patients")} />
                  <StatCard icon={<icons.Activity />} label="Active Requests" value={stats?.activeRequests} color="bg-orange-50 text-orange-600" onClick={() => setActiveTab("requests")} />
                  <StatCard icon={<icons.Bell />} label="Pending Approvals" value={stats?.pendingApprovals} color="bg-amber-50 text-amber-600" onClick={() => openNurses("pending")} />
                  <StatCard icon={<icons.Rupee />} label="Total Revenue" value={stats?.totalRevenue !== undefined ? `₹${Number(stats.totalRevenue).toLocaleString()}` : null} color="bg-green-50 text-green-600" />
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-5">
                {/* Weekly Revenue Bar Chart */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <h3 className="font-bold text-gray-900 mb-4">Weekly Revenue</h3>
                  {stats?.weeklyRevenue?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={stats.weeklyRevenue} barSize={28}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="amount" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-gray-300 text-sm">
                      {loadingStats ? "Loading chart…" : "No revenue data available"}
                    </div>
                  )}
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <h3 className="font-bold text-gray-900 mb-3">Recent Activity</h3>
                  {activity.length === 0 ? (
                    <div className="text-center text-gray-300 py-10 text-sm">{loadingStats ? "Loading…" : "No recent activity"}</div>
                  ) : (
                    <div className="space-y-1">
                      {activity.map((item, i) => (
                        <div key={item._id || item.id || i} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                          <span className="text-lg shrink-0 mt-0.5">
                            {/* ✅ FIX: Activity items are Notification objects with type field */}
                            {item.type === "nurse_approved" ? "✅"
                              : item.type === "nurse_rejected" ? "❌"
                              : item.type === "request_created" ? "📋"
                              : item.type === "request_completed" ? "🎉"
                              : "📌"}
                          </span>
                          <div className="min-w-0 flex-1">
                            {/* ✅ FIX: Notification has .message field and .userId.name for who */}
                            <p className="text-sm text-gray-800 font-medium leading-snug">{item.message}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {item.userId?.name && <span className="text-gray-500">{item.userId.name} · </span>}
                              {item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══ NURSES TAB ═══ */}
          {activeTab === "nurses" && (
            <div className="space-y-4">
              {nurseActionMsg && (
                <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                  nurseActionMsg.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}>
                  {nurseActionMsg.text}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><icons.Search /></span>
                  <input
                    type="text"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-300 bg-white"
                    placeholder="Search nurses..."
                    value={nurseSearch}
                    onChange={e => setNurseSearch(e.target.value)}
                  />
                </div>
                {["all", "pending", "approved", "rejected"].map(f => (
                  <button
                    key={f}
                    onClick={() => setNurseFilter(f)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize border transition-colors ${
                      nurseFilter === f
                        ? "bg-teal-600 text-white border-teal-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-teal-300"
                    }`}
                  >
                    {f}{f === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}
                  </button>
                ))}
              </div>

              {loadingNurses ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse h-24" />)}
                </div>
              ) : filteredNurses.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center text-gray-400">
                  <p className="text-2xl mb-2">👩‍⚕️</p>
                  <p className="text-sm">No nurses found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNurses.map(nurse => (
                    <div key={nurse._id} className={`bg-white rounded-xl border shadow-sm p-4 ${nurse.status === "pending" ? "border-amber-200 bg-amber-50/20" : "border-gray-100"}`}>
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center text-lg font-bold shrink-0">
                          {(nurse.name || "N").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <p className="font-semibold text-gray-900">{nurse.name}</p>
                            <NurseBadge status={nurse.status} />
                            {nurse.interviewScore !== null && nurse.interviewScore !== undefined && (
                              <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full">
                                🎯 Score: {nurse.interviewScore}
                              </span>
                            )}
                            {Number(nurse.totalRatings || 0) > 0 && (
                              <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                                ⭐ {Number(nurse.rating || 0).toFixed(1)} ({nurse.totalRatings})
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mb-2">
                            {nurse.email && <span>✉️ {nurse.email}</span>}
                            {nurse.phone && <span>📞 {nurse.phone}</span>}
                            {nurse.location && <span className="flex items-center gap-1"><icons.MapPin /> {nurse.location}</span>}
                            {nurse.experience && <span>🏥 {nurse.experience}</span>}
                            {nurse.earnings > 0 && <span className="text-teal-600 font-medium">₹{Number(nurse.earnings).toLocaleString()} earned</span>}
                          </div>
                          {nurse.specializations?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {nurse.specializations.map(s => (
                                <span key={s} className="text-xs px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-full">{s}</span>
                              ))}
                            </div>
                          )}
                          {nurse.documents && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {[
                                { key: "nursingCert", fileKey: "nursingCert", label: "Nursing Cert" },
                                { key: "idProof", fileKey: "idProof", label: "ID Proof" },
                                { key: "cvUploaded", fileKey: "resume", label: "CV / Resume" },
                              ].map(doc => (
                                <div key={doc.key} className={`text-xs flex items-center gap-1.5 px-2 py-1 rounded-full border ${nurse.documents[doc.key] ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-500 border-red-200"}`}>
                                  {nurse.documents[doc.key] ? <icons.Check /> : <icons.X />}
                                  <span>{doc.label}</span>
                                  {nurse.documentFiles?.[doc.fileKey]?.url && (
                                    <a
                                      href={`${axios.defaults.baseURL}${nurse.documentFiles[doc.fileKey].url}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="font-semibold underline decoration-emerald-300 underline-offset-2 hover:text-emerald-900"
                                    >
                                      View
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {nurse.interviewFeedback && (
                            <p className="mb-2 rounded-lg border border-purple-100 bg-purple-50 px-3 py-2 text-xs text-purple-700">
                              AI feedback: {nurse.interviewFeedback}
                            </p>
                          )}
                          {nurse.status === "rejected" && nurse.rejectionReason && (
                            <p className="mb-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                              Rejection reason: {nurse.rejectionReason}
                            </p>
                          )}
                        </div>
                        {nurse.status === "pending" && (
                          <div className="flex gap-2 shrink-0 self-start">
                            <button onClick={() => approveNurse(nurse._id)} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
                              <icons.Check /> Approve
                            </button>
                            <button onClick={() => rejectNurse(nurse._id)} className="flex items-center gap-1.5 border border-red-200 text-red-500 hover:bg-red-50 text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
                              <icons.X /> Reject
                            </button>
                          </div>
                        )}
                        {nurse.status === "approved" && (
                          <button onClick={() => rejectNurse(nurse._id)} className="shrink-0 border border-gray-200 text-gray-500 hover:bg-gray-50 text-xs px-3 py-2 rounded-lg transition-colors">
                            Suspend
                          </button>
                        )}
                        {nurse.status === "rejected" && (
                          <button onClick={() => approveNurse(nurse._id)} className="shrink-0 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
                            <icons.Check /> Approve
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ PATIENTS TAB ═══ */}
          {activeTab === "patients" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {["Name", "Phone", "Email", "Location", "Safety", "Address", "Status"].map(col => (
                          <th key={col} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loadingPatients ? (
                        <tr><td colSpan={7} className="text-center py-10 text-gray-300">Loading patients…</td></tr>
                      ) : patients.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-10 text-gray-300">No patients found</td></tr>
                      ) : patients.map(p => (
                        <tr key={p._id || p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-bold shrink-0">
                                {(p.name || "P").charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-gray-900">{p.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{p.phone || "—"}</td>
                          <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{p.email || "—"}</td>
                          {/* ✅ FIX: Patient model has city and address, not location */}
                          <td className="px-4 py-3 text-gray-600">{[p.city, p.address].filter(Boolean).join(", ") || "—"}</td>
                          <td className="px-4 py-3">
                            {p.safety?.unsafeFlag ? (
                              <div className="flex flex-col items-start gap-1">
                                <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
                                  Unsafe ({p.safety.reportCount || 1})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => clearPatientSafety(p._id || p.id)}
                                  className="text-xs font-semibold text-red-600 hover:underline"
                                >
                                  Clear flag
                                </button>
                              </div>
                            ) : (
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                                Clear
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {p.safety?.addressVerified ? (
                              <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">
                                Verified
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => verifyPatientAddress(p._id || p.id)}
                                className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                              >
                                Verify
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <PatientBadge status={p.isActive === false ? "inactive" : "active"} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══ REQUESTS TAB ═══ */}
          {activeTab === "requests" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {["Request ID", "Patient", "Nurse", "Mode", "Status", "Problem", "Amount", "Action"].map(col => (
                          <th key={col} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loadingRequests ? (
                        <tr><td colSpan={8} className="text-center py-10 text-gray-300">Loading requests…</td></tr>
                      ) : requests.length === 0 ? (
                        <tr><td colSpan={8} className="text-center py-10 text-gray-300">No requests found</td></tr>
                      ) : requests.map(req => (
                        <tr key={req._id || req.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">{(req._id || req.id || "").toString().slice(-8)}</td>
                          {/* ✅ FIX: Use flattened patientName/nurseName from mapped data */}
                          <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{req.patientName}</td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{req.nurseName}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${req.mode === "longterm" ? "bg-sky-50 text-sky-700 border-sky-200" : "bg-orange-50 text-orange-700 border-orange-200"}`}>
                              {req.mode === "longterm" ? "📅 Long-term" : "⚡ Temporary"}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap"><ReqBadge status={req.status} /></td>
                          <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">{req.problem || "—"}</td>
                          <td className="px-4 py-3 text-emerald-700 font-semibold whitespace-nowrap">
                            {req.amount ? `₹${Number(req.amount).toLocaleString()}` : "—"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {req.status === "pending-admin" ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => approvePatientRequest(req._id || req.id)}
                                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => rejectPatientRequest(req._id || req.id)}
                                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══ INTERVIEW REPORTS TAB ═══ */}
          {activeTab === "reports" && (
            <div className="space-y-4">
              {nurseActionMsg && (
                <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                  nurseActionMsg.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}>
                  {nurseActionMsg.text}
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">AI Video Interview Reports</h2>
                  <p className="text-sm text-gray-500">Saved locally from Dr. NIDHI interview room on this browser</p>
                </div>
                <button onClick={fetchInterviewReports} className="text-xs font-semibold text-teal-600 hover:underline">Refresh</button>
              </div>

              {interviewReports.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-400">
                  <p className="text-2xl mb-2">🎥</p>
                  <p className="text-sm">No completed interview reports on this device</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {interviewReports.map(report => {
                    const expanded = expandedReportId === report.id;
                    const recommendation = String(report.recommendation || "");
                    const score = Number(report.overallScore || 0);
                    const profile = getReportNurseProfile(report);
                    return (
                      <div key={report.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <p className="font-bold text-gray-950">{report.candidateName || "Nurse Candidate"}</p>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                score >= 80 ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : score >= 65 ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                              }`}>
                                Score {score}
                              </span>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                recommendation.includes("Not") ? "bg-red-50 text-red-700 border border-red-200"
                                : recommendation.includes("Strong") ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-sky-50 text-sky-700 border border-sky-200"
                              }`}>
                                {report.recommendation || "Review Required"}
                              </span>
                              {profile?.status && <NurseBadge status={profile.status} />}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                              <span>{report.interviewDate ? new Date(report.interviewDate).toLocaleString("en-IN") : "Date not available"}</span>
                              <span>Transcript: {report.transcript?.length || 0}</span>
                              <span>Attention events: {report.attentionEvents?.length || 0}</span>
                              {report.patientProblem && <span className="max-w-[320px] truncate">Case: {report.patientProblem}</span>}
                            </div>
                            {report.adminNotes && (
                              <p className="mt-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                                {report.adminNotes}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setExpandedReportId(expanded ? null : report.id)}
                              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                            >
                              {expanded ? "Hide Details" : "View Details"}
                            </button>
                            <button
                              type="button"
                              onClick={() => approveReportNurse(report)}
                              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                              Approve Nurse
                            </button>
                            <button
                              type="button"
                              onClick={() => rejectReportNurse(report)}
                              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                            >
                              Reject
                            </button>
                          </div>
                        </div>

                        {expanded && (
                          <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                            <div className="grid gap-2 sm:grid-cols-3">
                              {Object.entries(report.scores || {}).map(([key, value]) => (
                                <div key={key} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                                  <p className="text-[11px] font-semibold capitalize text-gray-500">{key.replace(/[A-Z]/g, m => ` ${m}`)}</p>
                                  <p className="text-lg font-black text-gray-900">{value}</p>
                                </div>
                              ))}
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                                <p className="text-xs font-bold text-emerald-800">Strengths</p>
                                <ul className="mt-2 space-y-1 text-xs text-emerald-900">
                                  {(report.strengths || []).map(item => <li key={item}>- {item}</li>)}
                                </ul>
                              </div>
                              <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                                <p className="text-xs font-bold text-amber-800">Concerns</p>
                                <ul className="mt-2 space-y-1 text-xs text-amber-900">
                                  {(report.concerns || []).length ? report.concerns.map(item => <li key={item}>- {item}</li>) : <li>No concerns recorded.</li>}
                                </ul>
                              </div>
                            </div>
                            <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                              <p className="text-xs font-bold text-red-800">Attention Events</p>
                              {(report.attentionEvents || []).length === 0 ? (
                                <p className="mt-2 text-xs text-red-700">No attention events recorded.</p>
                              ) : (
                                <div className="mt-2 space-y-1">
                                  {report.attentionEvents.map((event, index) => (
                                    <p key={`${event.at}-${index}`} className="text-xs text-red-800">
                                      {event.iso ? new Date(event.iso).toLocaleTimeString("en-IN") : ""} · {event.type}: {event.message}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-3">
                              <p className="mb-2 text-xs font-bold text-gray-700">Transcript</p>
                              <div className="space-y-2">
                                {(report.transcript || []).map((item, index) => (
                                  <div key={item.id || index} className={`rounded-lg px-3 py-2 text-xs ${item.role === "agent" ? "bg-sky-50 text-sky-900" : "bg-emerald-50 text-emerald-900"}`}>
                                    <span className="font-bold">{item.role === "agent" ? "Dr. NIDHI" : "Nurse"}:</span> {item.text}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══ SAFETY TAB ═══ */}
          {activeTab === "safety" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Safety Alerts</h2>
                  <p className="text-sm text-gray-500">SOS, unsafe patient reports, late checkout and manual review</p>
                </div>
                <button onClick={fetchSafetyAlerts} className="text-xs text-teal-600 hover:underline">Refresh</button>
              </div>

              {loadingSafety ? (
                <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-300">Loading safety alerts…</div>
              ) : safetyAlerts.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center text-gray-400">
                  <p className="text-2xl mb-2">🛡️</p>
                  <p className="text-sm">No safety alerts yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {safetyAlerts.map(alert => (
                    <div key={alert._id} className={`rounded-xl border bg-white p-4 shadow-sm ${alert.status === "open" ? "border-red-100" : "border-gray-100 opacity-75"}`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              alert.severity === "critical" ? "bg-red-100 text-red-700"
                              : alert.severity === "high" ? "bg-orange-100 text-orange-700"
                              : "bg-amber-100 text-amber-700"
                            }`}>
                              {alert.severity?.toUpperCase()}
                            </span>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                              {alert.type?.replace("_", " ")}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${alert.status === "open" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                              {alert.status}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-gray-900">{alert.message}</p>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                            <span>Patient: {alert.patientId?.name || "—"} {alert.patientId?.phone ? `· ${alert.patientId.phone}` : ""}</span>
                            <span>Nurse: {alert.nurseId?.name || "—"} {alert.nurseId?.phone ? `· ${alert.nurseId.phone}` : ""}</span>
                            <span>{alert.createdAt ? new Date(alert.createdAt).toLocaleString("en-IN") : ""}</span>
                          </div>
                          {alert.requestId?.problem && (
                            <p className="mt-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                              Request: {alert.requestId.problem}
                            </p>
                          )}
                          {alert.location?.lat && (
                            <a
                              href={`https://maps.google.com/?q=${alert.location.lat},${alert.location.lng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex text-xs font-semibold text-sky-600 underline"
                            >
                              Open SOS location
                            </a>
                          )}
                          {alert.patientId?.safety?.unsafeFlag && (
                            <p className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                              Patient unsafe flag: {alert.patientId.safety.unsafeReason || "Reported unsafe"} · Reports: {alert.patientId.safety.reportCount || 1}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          {alert.requestId?._id && alert.requestId?.safetyReview?.required && !alert.requestId?.safetyReview?.approved && (
                            <button
                              onClick={() => approveSafetyReview(alert.requestId._id)}
                              className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-700"
                            >
                              Approve Safety
                            </button>
                          )}
                          {alert.status === "open" && (
                            <button
                              onClick={() => resolveSafetyAlert(alert._id)}
                              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
