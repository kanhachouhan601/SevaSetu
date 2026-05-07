import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "../api/axios";
import { useAuth } from "../context/AuthContext";

// ── Icons ────────────────────────────────────────────────────
const HeartIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>
);
const BellIcon = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
);
const LogOutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
  </svg>
);
const StarIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-amber-400">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
    <path d="M20 6L9 17l-5-5"/>
  </svg>
);
const MapPinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);

const REQ_STATUS = {
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  matched: "bg-sky-50 text-sky-700 border border-sky-200",
  "interview-scheduled": "bg-purple-50 text-purple-700 border border-purple-200",
  "in-progress": "bg-teal-50 text-teal-700 border border-teal-200",
  completed: "bg-gray-100 text-gray-600 border border-gray-200",
  cancelled: "bg-red-50 text-red-600 border border-red-200",
};
function StatusBadge({ status }) {
  const emojis = { pending: "⏳", matched: "🔗", "interview-scheduled": "🎥", "in-progress": "🚀", completed: "✅", cancelled: "❌" };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${REQ_STATUS[status] || "bg-gray-100 text-gray-600 border border-gray-200"}`}>
      {emojis[status] || ""} {status?.replace("-", " ")}
    </span>
  );
}

function NotificationDropdown({ notifications }) {
  return (
    <div className="absolute right-0 top-12 w-80 max-w-[calc(100vw-2rem)] bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="font-semibold text-gray-900 text-sm">Notifications</p>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500 text-center">No notifications yet</p>
        ) : notifications.map(item => (
          <div key={item._id} className={`px-4 py-3 border-b border-gray-50 ${item.read ? "bg-white" : "bg-teal-50"}`}>
            <p className="text-sm text-gray-800 leading-snug">{item.message}</p>
            <p className="text-xs text-gray-500 mt-1">
              {item.createdAt ? new Date(item.createdAt).toLocaleString("en-IN") : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StarRating({ value = 0, max = 5 }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <StarIcon key={i} filled={i < Math.round(value)} />
      ))}
      <span className="text-xs text-gray-500 ml-1">{value ? value.toFixed(1) : "—"}</span>
    </span>
  );
}

function ScheduledInterviewAction({ req }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const schedule = req?.interviewSchedule;
  if (!schedule?.startsAt) return null;

  const start = new Date(schedule.startsAt).getTime();
  const end = schedule.endsAt ? new Date(schedule.endsAt).getTime() : start + 30 * 60 * 1000;
  const diff = start - now;
  const canStart = now >= start - 5 * 60 * 1000 && now <= end + 10 * 60 * 1000;

  const label = diff > 0
    ? `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m ${Math.floor((diff % 60000) / 1000)}s remaining`
    : now <= end ? "Interview window is open" : "Interview time has passed";

  return (
    <div className="space-y-2">
      <p className="text-xs text-purple-700 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
        AI video interview: {new Date(schedule.startsAt).toLocaleString("en-IN")} · {schedule.durationMinutes || 30} min
        <br />
        {label}
      </p>
      <Link
        to={`/nurse/interview/${req._id || req.id}`}
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
          canStart ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-gray-100 text-gray-400 pointer-events-none"
        }`}
      >
        Start Interview
      </Link>
    </div>
  );
}

export default function NurseDashboard() {
  const { user, logout } = useAuth();

  const [online, setOnline] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // ✅ FIX: nurseProfile loaded separately from /api/nurse/my-profile
  const [nurseProfile, setNurseProfile] = useState(null);

  // Assigned Requests
  const [requests, setRequests] = useState([]);
  const [loadingReqs, setLoadingReqs] = useState(true);

  // Job Feed — open requests from patients (pending, no nurse assigned)
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [applyingId, setApplyingId] = useState(null);
  const [visitInputs, setVisitInputs] = useState({});
  const [safetyMessage, setSafetyMessage] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const [reportDrafts, setReportDrafts] = useState({});

  useEffect(() => {
    fetchNurseProfile();
    fetchRequests();
    fetchJobs();
    fetchNotifications();

    const refreshTimer = setInterval(() => {
      fetchRequests();
      fetchJobs();
      fetchNotifications();
    }, 15000);

    return () => clearInterval(refreshTimer);
  }, []);

  // ✅ FIX: Load nurse profile from correct endpoint
  async function fetchNurseProfile() {
    try {
      const res = await axios.get("/api/nurse/my-profile");
      // Backend returns { success: true, profile: { ...nurseProfile, userId: { ...user } } }
      const profile = res.data?.profile || null;
      setNurseProfile(profile);
      setOnline(Boolean(profile?.availability));
    } catch {
      setNurseProfile(null);
    }
  }

  async function fetchRequests() {
    setLoadingReqs(true);
    try {
      const res = await axios.get("/api/request/nurse");
      // ✅ FIX: Backend returns { success, requests, pagination }
      const list = res.data?.requests || [];
      setRequests(list);
    } catch {
      setRequests([]);
    } finally {
      setLoadingReqs(false);
    }
  }

  async function fetchNotifications() {
    try {
      const res = await axios.get("/api/notifications");
      setNotifications(res.data?.notifications || []);
      setNotifCount(res.data?.unreadCount || 0);
    } catch {
      setNotifications([]);
      setNotifCount(0);
    }
  }

  async function openNotifications() {
    const next = !showNotifications;
    setShowNotifications(next);
    if (next && notifCount > 0) {
      try {
        await axios.put("/api/notifications/read");
        setNotifCount(0);
        setNotifications(list => list.map(item => ({ ...item, read: true })));
      } catch {
        fetchNotifications();
      }
    }
  }

  async function fetchJobs() {
    setLoadingJobs(true);
    try {
      const res = await axios.get("/api/request/open");
      setJobs(res.data?.requests || []);
    } catch {
      setJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  }

  async function updateRequestStatus(id, status) {
    try {
      await axios.put(`/api/request/${id}/status`, { status });
      fetchRequests();
      fetchJobs();
    } catch (err) {
      console.error("Status update failed:", err?.response?.data?.error);
    }
  }

  function getBrowserLocation() {
    return new Promise(resolve => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        pos => resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }

  function updateVisitInput(id, patch) {
    setVisitInputs(values => ({ ...values, [id]: { ...(values[id] || {}), ...patch } }));
  }

  async function checkInVisit(id) {
    setSafetyMessage("");
    const location = await getBrowserLocation();
    try {
      await axios.post(`/api/request/${id}/visit/check-in`, {
        otp: visitInputs[id]?.checkInOtp,
        location,
      });
      await Promise.all([fetchRequests(), fetchNotifications()]);
      updateVisitInput(id, { checkInOtp: "" });
    } catch (err) {
      setSafetyMessage(err?.response?.data?.error || "Check-in failed.");
    }
  }

  async function checkOutVisit(id) {
    setSafetyMessage("");
    const location = await getBrowserLocation();
    try {
      await axios.post(`/api/request/${id}/visit/check-out`, {
        otp: visitInputs[id]?.checkOutOtp,
        location,
      });
      await Promise.all([fetchRequests(), fetchNotifications()]);
      updateVisitInput(id, { checkOutOtp: "" });
    } catch (err) {
      setSafetyMessage(err?.response?.data?.error || "Check-out failed.");
    }
  }

  async function raiseSOS(id) {
    const confirmed = window.confirm("Emergency SOS admin ko turant bhejna hai?");
    if (!confirmed) return;
    const location = await getBrowserLocation();
    try {
      await axios.post(`/api/request/${id}/safety/sos`, {
        message: "Nurse feels unsafe during patient visit.",
        location,
      });
      setSafetyMessage("SOS sent to admin.");
      fetchNotifications();
    } catch (err) {
      setSafetyMessage(err?.response?.data?.error || "SOS send nahi ho paaya.");
    }
  }

  function updateReportDraft(id, patch) {
    setReportDrafts(values => ({ ...values, [id]: { ...(values[id] || {}), ...patch } }));
  }

  async function submitPatientReport(id) {
    const draft = reportDrafts[id] || {};
    try {
      await axios.post(`/api/request/${id}/safety/patient-report`, draft);
      await fetchRequests();
      setSafetyMessage("Patient behavior report submitted.");
    } catch (err) {
      setSafetyMessage(err?.response?.data?.error || "Report submit nahi ho paayi.");
    }
  }

  async function applyForRequest(id) {
    setApplyingId(id);
    try {
      const location = await getBrowserLocation();
      await axios.put(`/api/request/${id}/status`, { status: "matched", location });
      await Promise.all([fetchJobs(), fetchRequests(), fetchNotifications()]);
    } catch (err) {
      setSafetyMessage(err?.response?.data?.error || "Apply failed.");
    } finally {
      setApplyingId(null);
    }
  }

  // ✅ FIX: Toggle nurse availability via PUT /api/nurse/profile
  async function toggleAvailability(newStatus) {
    setOnline(newStatus);
    try {
      const location = newStatus ? await getBrowserLocation() : null;
      await axios.put("/api/nurse/profile", {
        availability: newStatus,
        ...(location ? { currentLocation: location } : {}),
      });
    } catch {
      setOnline(!newStatus); // revert on failure
    }
  }

  async function updateCurrentLocation() {
    setLocationMessage("Location update ho rahi hai...");
    const location = await getBrowserLocation();
    if (!location) {
      setLocationMessage("Location permission nahi mili. Browser me location allow karein.");
      return;
    }
    try {
      await axios.put("/api/nurse/profile", { currentLocation: location, availability: true });
      setOnline(true);
      setLocationMessage(`Location updated. Accuracy: ${Math.round(location.accuracy || 0)}m`);
    } catch {
      setLocationMessage("Location save nahi ho paayi.");
    }
  }

  // Profile display values — nurseProfile has userId populated
  const displayName = nurseProfile?.userId?.name || user?.name || "Nurse";
  const displayEmail = nurseProfile?.userId?.email || user?.email || "";
  const specializations = nurseProfile?.specializations || [];
  const experience = nurseProfile?.experience || 0;
  const rating = nurseProfile?.rating || 0;
  const earnings = nurseProfile?.earnings || 0;
  const profileStatus = nurseProfile?.status || "pending";
  const canHandleRequests = profileStatus === "approved";

  // Matched/assigned requests for nurse
  const completedRequests = requests.filter(r => r.status === "completed");
  const today = new Date().toDateString();
  const todayCompletedRequests = completedRequests.filter(req => (
    req.completedAt && new Date(req.completedAt).toDateString() === today
  ));
  const todayEarnings = todayCompletedRequests.reduce((sum, req) => sum + Number(req.amount || 0), 0);
  const activeVisits = requests.filter(req => ["matched", "interview-scheduled", "in-progress"].includes(req.status));
  const inProgressVisits = requests.filter(req => req.status === "in-progress");

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-sky-50/60 text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-teal-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-teal-500 flex items-center justify-center text-white">
              <HeartIcon />
            </div>
            <div>
              <p className="font-bold text-teal-900 leading-none">SevaSetu</p>
              <p className="text-xs text-teal-600 mt-0.5">{displayName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* ✅ FIX: Toggle calls API to update availability */}
            <div className="flex items-center gap-2 bg-white border border-teal-100 px-3 py-1.5 rounded-full">
              <span className="text-xs text-gray-500">Status</span>
              <button
                role="switch"
                aria-checked={online}
                onClick={() => toggleAvailability(!online)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${online ? "bg-teal-500" : "bg-gray-300"}`}
              >
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform ${online ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
              <span className={`text-xs font-semibold ${online ? "text-teal-600" : "text-gray-500"}`}>
                {online ? "Online" : "Offline"}
              </span>
            </div>

            <div className="relative">
              <button
                onClick={openNotifications}
                className="relative p-2 rounded-xl bg-white border border-teal-100 text-gray-500 hover:text-teal-600 hover:border-teal-200 transition-colors"
              >
                <BellIcon />
                {notifCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {notifCount}
                  </span>
                )}
              </button>
              {showNotifications && <NotificationDropdown notifications={notifications} />}
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <LogOutIcon /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-teal-100 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-teal-600 flex items-center justify-center text-2xl font-bold text-white shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${online ? "bg-teal-50 text-teal-700 border border-teal-200" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
                  {online ? "🟢 Online" : "⚫ Offline"}
                </span>
                {/* ✅ Show approval status */}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  profileStatus === "approved" ? "bg-green-50 text-green-700 border border-green-200"
                  : profileStatus === "rejected" ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                }`}>
                  {profileStatus === "approved" ? "✅ Approved" : profileStatus === "rejected" ? "❌ Rejected" : "⏳ Pending Approval"}
                </span>
              </div>
              {specializations.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {specializations.map(s => (
                    <span key={s} className="text-xs px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100">{s}</span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-500">
                {experience > 0 && <span>🏥 {experience} yrs experience</span>}
                <span className="flex items-center gap-1"><StarRating value={rating} /></span>
                {earnings > 0 && (
                  <span className="text-teal-600 font-semibold">₹{Number(earnings).toLocaleString()} earned</span>
                )}
              </div>
              {/* ✅ Show stats */}
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                <span>📋 {requests.length} total requests</span>
                <span>✅ {completedRequests.length} completed</span>
              </div>
            </div>
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <button
                type="button"
                onClick={updateCurrentLocation}
                className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-100"
              >
                Update location
              </button>
              {locationMessage && <p className="text-xs text-teal-700">{locationMessage}</p>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-teal-100 bg-white p-3">
            <p className="text-xs font-medium text-gray-500">Active Visits</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{activeVisits.length}</p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-white p-3">
            <p className="text-xs font-medium text-gray-500">In Progress</p>
            <p className="mt-1 text-xl font-bold text-emerald-700">{inProgressVisits.length}</p>
          </div>
          <div className="rounded-xl border border-sky-100 bg-white p-3">
            <p className="text-xs font-medium text-gray-500">Today Earnings</p>
            <p className="mt-1 text-xl font-bold text-sky-700">₹{Number(todayEarnings).toLocaleString()}</p>
          </div>
        </div>

        {/* Open Requests */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 text-lg">Open Requests</h2>
            <button onClick={fetchJobs} className="text-xs text-teal-600 hover:underline">Refresh</button>
          </div>
          {!canHandleRequests ? (
            <div className="bg-white rounded-xl border border-amber-100 p-5 text-sm text-amber-700">
              Admin approval ke baad hi patient requests accept kar paoge. Current status: {profileStatus}.
            </div>
          ) : loadingJobs ? (
            <div className="bg-white rounded-xl border border-teal-100 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-teal-100 p-8 text-center text-gray-500">
              <p className="text-2xl mb-2">🩺</p>
              <p className="text-sm">No open patient requests right now</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map(job => (
                <div key={job._id || job.id} className="bg-white rounded-xl border border-teal-100 p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <p className="font-semibold text-gray-900">{job.patientId?.name || "Patient"}</p>
                    <StatusBadge status={job.status} />
                    <span className={`text-xs px-2 py-0.5 rounded-full ${job.mode === "longterm" ? "bg-sky-50 text-sky-700 border border-sky-100" : "bg-orange-50 text-orange-700 border border-orange-100"}`}>
                      {job.mode === "longterm" ? "📅 Long-term" : "⚡ Temporary"}
                    </span>
                    {job.amount > 0 && (
                      <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        ₹{Number(job.amount).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mb-1">{job.problem}</p>
                  {job.requirements && (
                    <p className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 mb-2">
                      Requirements: {job.requirements}
                    </p>
                  )}
                  {job.attachments?.length > 0 && (
                    <p className="text-xs text-sky-700 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2 mb-2">
                      {job.attachments.length} medical file(s) uploaded by patient
                    </p>
                  )}
                  {job.matchingReason && (
                    <p className="text-xs text-teal-700 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2 mb-2">
                      {job.matchingReason}
                    </p>
                  )}
                  {job.mode === "temporary" && job.rideTracking?.patientLocation?.lat && (
                    <p className="text-xs text-orange-700 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 mb-2">
                      Patient shared live pickup location. Accept karte waqt aapki current location se ETA patient ko dikhega.
                    </p>
                  )}
                  {(job.address || job.city) && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                      <MapPinIcon /> {[job.address, job.city].filter(Boolean).join(", ")}
                    </div>
                  )}
                  <button
                    onClick={() => applyForRequest(job._id || job.id)}
                    disabled={applyingId === (job._id || job.id)}
                    className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <CheckIcon /> {applyingId === (job._id || job.id)
                      ? "Accepting..."
                      : job.mode === "longterm" ? "Accept & Schedule Interview" : "Accept Request"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assigned Requests */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900 text-lg">Assigned Requests</h2>
            <button onClick={fetchRequests} className="text-xs text-teal-600 hover:underline">Refresh</button>
          </div>
          {safetyMessage && (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {safetyMessage}
            </div>
          )}
          {loadingReqs ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-white rounded-xl border border-teal-100 p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : !canHandleRequests ? (
            <div className="bg-white rounded-xl border border-amber-100 p-5 text-sm text-amber-700">
              Admin approval ke baad assigned visits handle kar paoge.
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-teal-100 p-8 text-center text-gray-500">
              <p className="text-2xl mb-2">📋</p>
              <p className="text-sm">No assigned requests yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(req => (
                <div key={req._id || req.id} className="bg-white rounded-xl border border-teal-100 p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {/* ✅ FIX: patientId is populated object, not flat patientName */}
                    <p className="font-semibold text-gray-900">{req.patientId?.name || "Patient"}</p>
                    <StatusBadge status={req.status} />
                    <span className={`text-xs px-2 py-0.5 rounded-full ${req.mode === "longterm" ? "bg-sky-50 text-sky-700 border border-sky-100" : "bg-orange-50 text-orange-700 border border-orange-100"}`}>
                      {req.mode === "longterm" ? "📅 Long-term" : "⚡ Temporary"}
                    </span>
                    {req.amount > 0 && (
                      <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        ₹{Number(req.amount).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mb-1">{req.problem}</p>
                  {req.requirements && (
                    <p className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 mb-2">
                      Requirements: {req.requirements}
                    </p>
                  )}
                  {req.attachments?.length > 0 && (
                    <p className="text-xs text-sky-700 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2 mb-2">
                      {req.attachments.length} medical file(s) uploaded by patient
                    </p>
                  )}
                  {req.arrivalEtaAt && (
                    <p className="text-xs text-sky-700 bg-sky-50 border border-sky-100 rounded-lg px-3 py-2 mb-2">
                      Estimated arrival: {new Date(req.arrivalEtaAt).toLocaleString("en-IN")}
                    </p>
                  )}
                  {req.interviewSchedule?.startsAt && <ScheduledInterviewAction req={req} />}
                  {(req.address || req.city) && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                      <MapPinIcon /> {[req.address, req.city].filter(Boolean).join(", ")}
                    </div>
                  )}
                  {/* ✅ FIX: Show patient phone from populated patientId */}
                  {req.patientId?.phone && (
                    <div className="text-xs text-teal-600 mb-3">📞 {req.patientId.phone}</div>
                  )}
                  {req.safetyReview?.required && (
                    <div className="mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                      Safety review: {req.safetyReview.reason || "extra safety verification required"}
                      {req.safetyReview.approved ? " · Approved by admin" : " · Pending admin review"}
                    </div>
                  )}
                  {["matched", "in-progress"].includes(req.status) && (
                    <div className="mb-3 rounded-xl border border-red-100 bg-red-50/70 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => raiseSOS(req._id || req.id)}
                          className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                        >
                          Emergency SOS
                        </button>
                        <span className="text-xs text-red-700">Unsafe behavior ya emergency me use karein.</span>
                      </div>
                    </div>
                  )}
                  {req.status === "matched" && (
                    <div className="mb-3 rounded-xl border border-teal-100 bg-teal-50/70 p-3">
                      <p className="mb-2 text-xs font-semibold text-teal-900">Visit Check-in OTP</p>
                      <div className="flex gap-2">
                        <input
                          value={visitInputs[req._id || req.id]?.checkInOtp || ""}
                          onChange={e => updateVisitInput(req._id || req.id, { checkInOtp: e.target.value })}
                          placeholder="Patient se 6-digit OTP"
                          className="min-w-0 flex-1 rounded-lg border border-teal-100 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-teal-200"
                        />
                        <button
                          type="button"
                          onClick={() => checkInVisit(req._id || req.id)}
                          className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-700"
                        >
                          Check-in
                        </button>
                      </div>
                    </div>
                  )}
                  {req.status === "in-progress" && (
                    <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
                      <p className="mb-2 text-xs font-semibold text-emerald-900">Visit Check-out OTP</p>
                      <div className="flex gap-2">
                        <input
                          value={visitInputs[req._id || req.id]?.checkOutOtp || ""}
                          onChange={e => updateVisitInput(req._id || req.id, { checkOutOtp: e.target.value })}
                          placeholder="Patient se 6-digit OTP"
                          className="min-w-0 flex-1 rounded-lg border border-emerald-100 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-200"
                        />
                        <button
                          type="button"
                          onClick={() => checkOutVisit(req._id || req.id)}
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          Check-out
                        </button>
                      </div>
                    </div>
                  )}
                  {req.status === "completed" && (
                    <div className="mb-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                      {req.nursePatientReport?.reportedAt ? (
                        <p className="text-xs text-gray-600">Patient behavior report submitted.</p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-gray-900">Patient behavior report</p>
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={(reportDrafts[req._id || req.id] || {}).respectful || ""}
                              onChange={e => updateReportDraft(req._id || req.id, { respectful: e.target.value })}
                              className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs"
                            >
                              <option value="">Behavior</option>
                              <option value="respectful">Respectful</option>
                              <option value="rude">Rude</option>
                              <option value="harassment_concern">Harassment concern</option>
                            </select>
                            <select
                              value={(reportDrafts[req._id || req.id] || {}).environment || ""}
                              onChange={e => updateReportDraft(req._id || req.id, { environment: e.target.value })}
                              className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs"
                            >
                              <option value="">Environment</option>
                              <option value="safe">Safe</option>
                              <option value="unsafe">Unsafe</option>
                            </select>
                          </div>
                          <label className="flex items-center gap-2 text-xs text-gray-600">
                            <input
                              type="checkbox"
                              checked={Boolean((reportDrafts[req._id || req.id] || {}).paymentIssue)}
                              onChange={e => updateReportDraft(req._id || req.id, { paymentIssue: e.target.checked })}
                            />
                            Payment issue
                          </label>
                          <label className="flex items-center gap-2 text-xs text-red-600">
                            <input
                              type="checkbox"
                              checked={Boolean((reportDrafts[req._id || req.id] || {}).unsafeFlag)}
                              onChange={e => updateReportDraft(req._id || req.id, { unsafeFlag: e.target.checked })}
                            />
                            Mark patient unsafe
                          </label>
                          <textarea
                            rows={2}
                            value={(reportDrafts[req._id || req.id] || {}).comment || ""}
                            onChange={e => updateReportDraft(req._id || req.id, { comment: e.target.value })}
                            placeholder="Family behavior, safety concern, payment issue..."
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs resize-none"
                          />
                          <button
                            type="button"
                            onClick={() => submitPatientReport(req._id || req.id)}
                            className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white"
                          >
                            Submit report
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2">
                    {req.status === "interview-scheduled" && (
                      <button disabled
                        className="flex items-center gap-1.5 bg-purple-100 text-purple-700 text-xs font-medium px-3 py-1.5 rounded-lg">
                        Interview Scheduled
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Requests Summary */}
        {completedRequests.length > 0 && (
          <div>
            <h2 className="font-bold text-gray-900 text-lg mb-3">Completed Work</h2>
            <div className="space-y-3">
              {completedRequests.slice(0, 5).map(req => (
                <div key={req._id} className="bg-white rounded-xl border border-teal-100 p-4 opacity-75">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900 text-sm">{req.patientId?.name || "Patient"}</p>
                    <StatusBadge status={req.status} />
                    {req.amount > 0 && <span className="text-xs text-teal-600 font-semibold">₹{req.amount}</span>}
                  </div>
                  <p className="text-xs text-gray-500">{req.problem}</p>
                  {req.completedAt && (
                    <p className="text-xs text-gray-400 mt-1">
                      Completed: {new Date(req.completedAt).toLocaleDateString("en-IN")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
