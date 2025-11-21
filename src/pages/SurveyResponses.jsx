// src/pages/SurveyResponses.jsx
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  FaClipboardList,
  FaSearch,
  FaPlay,
  FaRegClock,
  FaStopCircle,
  FaUser,
  FaHeadphones,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaLocationArrow,
  FaEye,
  FaArrowLeft,
} from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import {
  listAllPublicSurveyResponses,
  setSurveyResponseApproval,
} from "../apis/surveyPublic";

const fmtDateTime = (d) => {
  if (!d) return "-";
  try {
    const dt = new Date(d);
    return `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } catch {
    return "-";
  }
};

// Frontend labels for approvalStatus
const APPROVAL_OPTIONS = [
  { value: "PENDING", label: "Not Reviewed" },
  { value: "CORRECTLY_DONE", label: "Correctly Done" },
  { value: "NOT_ASKING_ALL_QUESTIONS", label: "Not asking all the questions" },
  { value: "NOT_DOING_IT_PROPERLY", label: "Not doing it properly" },
  {
    value: "TAKING_FROM_FRIENDS_OR_TEAMMATE",
    label: "Taking from Friends/Teammate",
  },
  { value: "FAKE_OR_EMPTY_AUDIO", label: "Fake Audio / Empty audio" },
];

const APPROVAL_LABELS = APPROVAL_OPTIONS.reduce((acc, o) => {
  acc[o.value] = o.label;
  return acc;
}, {});

// Helper to style the approval chip
const getApprovalChipStyle = (status, themeColors) => {
  switch (status) {
    case "CORRECTLY_DONE":
      return {
        bg: themeColors.success + "20",
        color: themeColors.success,
      };
    case "NOT_ASKING_ALL_QUESTIONS":
    case "NOT_DOING_IT_PROPERLY":
    case "TAKING_FROM_FRIENDS_OR_TEAMMATE":
    case "FAKE_OR_EMPTY_AUDIO":
      return {
        bg: themeColors.danger + "20",
        color: themeColors.danger,
      };
    case "PENDING":
    default:
      return {
        bg: themeColors.border,
        color: themeColors.text,
      };
  }
};

// ================= STEP 3b: SINGLE RESPONSE DETAIL =================
function ResponseDetailPanel({
  survey,
  response,
  themeColors,
  approvingId,
  onSetApproval,
  onBack,
}) {
  if (!survey || !response) return null;

  const status = response.approvalStatus || "PENDING";
  const label = APPROVAL_LABELS[status] || status;
  const chipStyle = getApprovalChipStyle(status, themeColors);

  const lat =
    typeof response.latitude === "number"
      ? response.latitude
      : response.latitude != null
      ? Number(response.latitude)
      : null;
  const lng =
    typeof response.longitude === "number"
      ? response.longitude
      : response.longitude != null
      ? Number(response.longitude)
      : null;
  const hasLocation =
    lat != null && !Number.isNaN(lat) && lng != null && !Number.isNaN(lng);

  let mapSrc = "";
  if (hasLocation) {
    const delta = 0.01;
    const left = lng - delta;
    const bottom = lat - delta;
    const right = lng + delta;
    const top = lat + delta;
    mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lng}`;
  }

  return (
    <div
      className="mt-4 rounded-2xl border shadow-sm"
      style={{
        backgroundColor: themeColors.surface,
        borderColor: themeColors.border,
      }}
    >
      {/* Top bar */}
      <div
        className="px-4 sm:px-6 py-3 border-b flex items-center justify-between gap-3"
        style={{ borderColor: themeColors.border }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold"
            style={{
              borderColor: themeColors.border,
              backgroundColor: themeColors.background,
              color: themeColors.text,
            }}
          >
            <FaArrowLeft />
            Back to submissions
          </button>
          <div>
            <p
              className="text-xs uppercase font-semibold opacity-70"
              style={{ color: themeColors.text }}
            >
              Entry detail
            </p>
            <h2
              className="text-sm sm:text-base font-bold"
              style={{ color: themeColors.text }}
            >
              {survey.name} · Entry #{response.responseId}
            </h2>
          </div>
        </div>

        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
          style={{
            backgroundColor: chipStyle.bg,
            color: chipStyle.color,
          }}
        >
          {status === "CORRECTLY_DONE" && <FaCheckCircle />}
          {label}
        </span>
      </div>

      {/* Info + audio + map + approval select */}
      <div className="px-4 sm:px-6 py-4 grid md:grid-cols-3 gap-4">
        {/* Left: meta */}
        <div className="md:col-span-2 space-y-1 text-xs">
          <p style={{ color: themeColors.text }}>
            <span className="font-semibold">Collected At:</span>{" "}
            {fmtDateTime(response.createdAt)}
          </p>
          <p style={{ color: themeColors.text }}>
            <span className="font-semibold">Collected By:</span>{" "}
            {response.userName || response.userCode || "-"}{" "}
            {response.userMobile ? `(${response.userMobile})` : ""}
          </p>
          <p style={{ color: themeColors.text }}>
            <span className="font-semibold">Status:</span> {survey.status}
          </p>
          {response.isCompleted === false && (
            <p style={{ color: themeColors.danger }}>
              (This response was not fully completed)
            </p>
          )}
          {hasLocation && (
            <p
              className="flex items-center gap-1 mt-1"
              style={{ color: themeColors.text }}
            >
              <FaMapMarkerAlt className="text-[10px]" />
              Lat:{" "}
              <span className="font-mono">{lat.toFixed(4)}</span>, Lng:{" "}
              <span className="font-mono">{lng.toFixed(4)}</span>
            </p>
          )}
        </div>

        {/* Right: audio + approval + map small */}
        <div className="space-y-2">
          {response.audioUrl && (
            <div>
              <p
                className="text-[11px] mb-1 opacity-70"
                style={{ color: themeColors.text }}
              >
                Audio Recording
              </p>
              <audio controls className="w-full" src={response.audioUrl}>
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label
              className="text-[11px] opacity-70"
              style={{ color: themeColors.text }}
            >
              Review / Approval Status
            </label>
            <select
              className="w-full px-2 py-1.5 rounded-lg border text-[11px]"
              style={{
                borderColor: themeColors.border,
                backgroundColor: themeColors.surface,
                color: themeColors.text,
              }}
              value={status}
              disabled={approvingId === response.responseId}
              onChange={(e) =>
                onSetApproval(response.responseId, e.target.value)
              }
            >
              {APPROVAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {approvingId === response.responseId && (
              <span
                className="text-[11px] opacity-70"
                style={{ color: themeColors.text }}
              >
                Updating status...
              </span>
            )}
          </div>

          {hasLocation && (
            <div
              className="mt-1 w-full rounded-lg overflow-hidden border"
              style={{
                borderColor: themeColors.border,
                backgroundColor: themeColors.surface,
              }}
            >
              <div className="h-24 w-full">
                <iframe
                  title={`location-${response.responseId}`}
                  src={mapSrc}
                  className="w-full h-full border-0"
                  loading="lazy"
                />
              </div>
              <button
                type="button"
                onClick={() =>
                  window.open(
                    `https://www.google.com/maps?q=${lat},${lng}`,
                    "_blank"
                  )
                }
                className="w-full text-[11px] flex items-center justify-center gap-1 px-2 py-1 border-t"
                style={{
                  borderColor: themeColors.border,
                  color: themeColors.primary,
                  backgroundColor: themeColors.surface,
                }}
              >
                <FaLocationArrow className="text-[10px]" />
                Open in Maps
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Q&A */}
      <div className="px-4 sm:px-6 pb-4 space-y-3">
        {(response.answers || []).map((a, qIndex) => {
          let answerText = "-";

          if (a.questionType === "OPEN_ENDED") {
            answerText = a.answerText || "-";
          } else if (a.questionType === "RATING") {
            answerText =
              typeof a.rating === "number" ? String(a.rating) : "-";
          } else {
            const opts = a.selectedOptions || [];
            answerText = opts.length > 0 ? opts.join(", ") : "-";
          }

          return (
            <div
              key={a.questionId || qIndex}
              className="rounded-lg border p-2.5 sm:p-3"
              style={{
                borderColor: themeColors.border,
                backgroundColor: themeColors.surface,
              }}
            >
              <div className="flex flex-col gap-1">
                <p
                  className="text-xs font-semibold"
                  style={{ color: themeColors.text }}
                >
                  Q{qIndex + 1}. {a.questionText}
                </p>
                <p
                  className="text-[11px] opacity-70"
                  style={{ color: themeColors.text }}
                >
                  Type: {a.questionType}
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: themeColors.text }}
                >
                  <span className="font-semibold">Answer: </span>
                  {answerText}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ================= STEP 3a: USER-WISE SUBMISSIONS =================
function UserSubmissionsPanel({
  survey,
  userKey,
  themeColors,
  approvingId,
  onSetApproval,
  onBackToUsers,
  onOpenResponse,
}) {
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, APPROVED, NOT_APPROVED, PENDING, or reason

  const {
    userResponses,
    filteredResponses,
    locs,
    mapSrc,
    centreLat,
    centreLng,
  } = useMemo(() => {
    const allResponses = (survey.responses || []).filter((r) => {
      const key =
        r.userMobile || r.userCode || `unknown-${String(r.userName || "")}`;
      return String(key) === String(userKey);
    });

    // apply status filter
    let list = allResponses;
    if (statusFilter === "APPROVED") {
      list = list.filter((r) => r.isApproved);
    } else if (statusFilter === "NOT_APPROVED") {
      list = list.filter((r) => !r.isApproved);
    } else if (statusFilter === "PENDING") {
      list = list.filter(
        (r) => (r.approvalStatus || "PENDING") === "PENDING"
      );
    } else if (APPROVAL_OPTIONS.some((o) => o.value === statusFilter)) {
      list = list.filter(
        (r) => (r.approvalStatus || "PENDING") === statusFilter
      );
    }

    // locations from filtered list
    const locs = list
      .map((r) => {
        const lat =
          typeof r.latitude === "number"
            ? r.latitude
            : r.latitude != null
            ? Number(r.latitude)
            : null;
        const lng =
          typeof r.longitude === "number"
            ? r.longitude
            : r.longitude != null
            ? Number(r.longitude)
            : null;
        if (
          lat == null ||
          Number.isNaN(lat) ||
          lng == null ||
          Number.isNaN(lng)
        )
          return null;
        return { lat, lng };
      })
      .filter(Boolean);

    let centreLat = null;
    let centreLng = null;
    let mapSrc = "";

    if (locs.length > 0) {
      const sum = locs.reduce(
        (acc, p) => {
          acc.lat += p.lat;
          acc.lng += p.lng;
          return acc;
        },
        { lat: 0, lng: 0 }
      );
      centreLat = sum.lat / locs.length;
      centreLng = sum.lng / locs.length;
      const delta = 0.05;
      const left = centreLng - delta;
      const bottom = centreLat - delta;
      const right = centreLng + delta;
      const top = centreLat + delta;
      mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${centreLat}%2C${centreLng}`;
    }

    return {
      userResponses: allResponses,
      filteredResponses: list,
      locs,
      mapSrc,
      centreLat,
      centreLng,
    };
  }, [survey.responses, userKey, statusFilter]);

  const anyResp = userResponses[0];
  const userName = anyResp?.userName || anyResp?.userCode || "Unknown User";
  const userMobile = anyResp?.userMobile || "-";

  return (
    <div className="space-y-4 mt-4">
      {/* Header row with back + filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToUsers}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold"
            style={{
              borderColor: themeColors.border,
              backgroundColor: themeColors.surface,
              color: themeColors.text,
            }}
          >
            <FaArrowLeft />
            Back to users
          </button>
          <div>
            <p
              className="text-xs uppercase font-semibold opacity-70"
              style={{ color: themeColors.text }}
            >
              Submissions from
            </p>
            <h2
              className="text-lg font-semibold flex flex-wrap gap-1"
              style={{ color: themeColors.text }}
            >
              {userName}{" "}
              <span className="text-xs font-normal opacity-80">
                ({userMobile})
              </span>
            </h2>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <p
            className="text-xs opacity-70"
            style={{ color: themeColors.text }}
          >
            Total Entries:{" "}
            <span className="font-semibold">{userResponses.length}</span>{" "}
            {statusFilter !== "ALL" && (
              <>
                · Showing:{" "}
                <span className="font-semibold">
                  {filteredResponses.length}
                </span>
              </>
            )}
          </p>

          <div className="flex items-center gap-2">
            <span
              className="text-[11px] opacity-70"
              style={{ color: themeColors.text }}
            >
              Filter by QC status
            </span>
            <select
              className="px-2 py-1.5 rounded-lg border text-[11px]"
              style={{
                borderColor: themeColors.border,
                backgroundColor: themeColors.background,
                color: themeColors.text,
              }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All responses</option>
              <option value="APPROVED">Approved (Correctly Done)</option>
              <option value="NOT_APPROVED">Not Approved</option>
              <option value="PENDING">Pending / Not Reviewed</option>
              <option disabled>── By Reason ──</option>
              {APPROVAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table + map layout */}
      <div className="grid lg:grid-cols-[2fr,1fr] gap-4">
        {/* Table */}
        <div
          className="rounded-2xl border shadow-sm overflow-hidden"
          style={{
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
          }}
        >
          <div className="overflow-x-auto max-h-[55vh]">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ backgroundColor: themeColors.background + "30" }}>
                  {["ID", "Collected At", "QC Status", ""].map((head) => (
                    <th
                      key={head}
                      className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide"
                      style={{ color: themeColors.text }}
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody
                className="divide-y"
                style={{ borderColor: themeColors.border }}
              >
                {filteredResponses
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt || 0) -
                      new Date(a.createdAt || 0)
                  )
                  .map((resp) => {
                    const st = resp.approvalStatus || "PENDING";
                    const lbl = APPROVAL_LABELS[st] || st;
                    const chipStyle = getApprovalChipStyle(
                      st,
                      themeColors
                    );

                    return (
                      <tr key={resp.responseId}>
                        <td
                          className="px-3 py-2 font-mono"
                          style={{ color: themeColors.text }}
                        >
                          {resp.responseId}
                        </td>
                        <td
                          className="px-3 py-2"
                          style={{ color: themeColors.text }}
                        >
                          {fmtDateTime(resp.createdAt)}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]"
                            style={{
                              backgroundColor: chipStyle.bg,
                              color: chipStyle.color,
                            }}
                          >
                            {st === "CORRECTLY_DONE" && <FaCheckCircle />}
                            {lbl}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => onOpenResponse(resp.responseId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold"
                            style={{
                              borderColor: themeColors.primary,
                              backgroundColor: themeColors.surface,
                              color: themeColors.primary,
                            }}
                          >
                            <FaEye />
                            View / Update
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                {filteredResponses.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-6 text-center"
                      style={{ color: themeColors.text }}
                    >
                      No submissions found for current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Map side panel */}
        <div
          className="rounded-2xl border shadow-sm flex flex-col"
          style={{
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
          }}
        >
          <div className="px-3 py-2 border-b">
            <p
              className="text-[11px] font-semibold uppercase tracking-wide opacity-70"
              style={{ color: themeColors.text }}
            >
              Location Map
            </p>
            <p
              className="text-[11px] opacity-70"
              style={{ color: themeColors.text }}
            >
              {locs.length > 0
                ? `${locs.length} recorded locations (filtered list)`
                : "No location data available for current filters"}
            </p>
          </div>
          <div className="flex-1">
            {mapSrc ? (
              <iframe
                title="user-locations-map"
                src={mapSrc}
                className="w-full h-full border-0"
                loading="lazy"
              />
            ) : (
              <div className="h-full flex items-center justify-center px-3 text-center">
                <p
                  className="text-xs opacity-70"
                  style={{ color: themeColors.text }}
                >
                  Location data not available.
                </p>
              </div>
            )}
          </div>
          {centreLat != null && centreLng != null && (
            <button
              type="button"
              onClick={() =>
                window.open(
                  `https://www.google.com/maps?q=${centreLat},${centreLng}`,
                  "_blank"
                )
              }
              className="w-full text-[11px] flex items-center justify-center gap-1 px-2 py-1.5 border-t"
              style={{
                borderColor: themeColors.border,
                color: themeColors.primary,
                backgroundColor: themeColors.surface,
              }}
            >
              <FaLocationArrow className="text-[10px]" />
              Open area in Maps
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ================= STEP 2: USER LIST FOR A SURVEY =================
function SurveyUserListPanel({
  survey,
  themeColors,
  onBackToSurveys,
  onSelectUser,
}) {
  const [search, setSearch] = useState("");

  const users = useMemo(() => {
    const map = new Map();
    (survey.responses || []).forEach((r) => {
      const key =
        r.userMobile || r.userCode || `unknown-${String(r.userName || "")}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          userMobile: r.userMobile,
          userName: r.userName || r.userCode || "Unknown",
          entries: 1,
        });
      } else {
        const old = map.get(key);
        map.set(key, { ...old, entries: old.entries + 1 });
      }
    });

    let list = Array.from(map.values());

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((u) =>
        [u.userMobile, u.userName]
          .filter(Boolean)
          .map((v) => String(v).toLowerCase())
          .some((v) => v.includes(q))
      );
    }

    // sort descending by entries
    list.sort((a, b) => b.entries - a.entries);

    return list;
  }, [survey.responses, search]);

  return (
    <div className="space-y-4 mt-4">
      {/* Top header + back */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToSurveys}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold"
            style={{
              borderColor: themeColors.border,
              backgroundColor: themeColors.surface,
              color: themeColors.text,
            }}
          >
            <FaArrowLeft />
            Back to surveys
          </button>
          <div>
            <p
              className="text-[11px] uppercase font-semibold opacity-70"
              style={{ color: themeColors.text }}
            >
              Users for Survey
            </p>
            <h2
              className="text-lg font-semibold"
              style={{ color: themeColors.text }}
            >
              {survey.name}{" "}
              <span className="text-xs font-mono opacity-70">
                ({survey.surveyCode})
              </span>
            </h2>
          </div>
        </div>

        <div className="w-full md:w-72 relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60 text-xs" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user mobile or name"
            className="w-full pl-8 pr-3 py-2 rounded-lg border text-xs"
            style={{
              borderColor: themeColors.border,
              backgroundColor: themeColors.background,
              color: themeColors.text,
            }}
          />
        </div>
      </div>

      {/* Users table  (AC / LokSabha removed) */}
      <div
        className="rounded-2xl border shadow-sm overflow-hidden"
        style={{
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
        }}
      >
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: themeColors.background + "30" }}>
                {["User Mobile", "User Name", "#Entries", ""].map((head) => (
                  <th
                    key={head}
                    className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: themeColors.text }}
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody
              className="divide-y"
              style={{ borderColor: themeColors.border }}
            >
              {users.map((u) => (
                <tr key={u.key}>
                  <td
                    className="px-4 py-2 font-mono"
                    style={{ color: themeColors.text }}
                  >
                    {u.userMobile || "-"}
                  </td>
                  <td
                    className="px-4 py-2"
                    style={{ color: themeColors.text }}
                  >
                    {u.userName}
                  </td>
                  <td
                    className="px-4 py-2 font-semibold"
                    style={{ color: themeColors.primary }}
                  >
                    {u.entries}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onSelectUser(u.key)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[11px] font-semibold"
                      style={{
                        borderColor: themeColors.primary,
                        backgroundColor: themeColors.surface,
                        color: themeColors.primary,
                      }}
                    >
                      <FaEye />
                      View Entries
                    </button>
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center"
                    style={{ color: themeColors.text }}
                  >
                    No users found for this survey.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ================= STEP 1: SURVEY LIST (MAIN PAGE) =================
export default function SurveyResponses() {
  const { themeColors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [surveys, setSurveys] = useState([]); // full data with responses[]

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // step navigation
  const [selectedSurveyId, setSelectedSurveyId] = useState(null); // step 2+
  const [selectedUserKey, setSelectedUserKey] = useState(null); // step 3+
  const [selectedResponseId, setSelectedResponseId] = useState(null); // step 3b

  // which response is being updated for approvalStatus
  const [approvingId, setApprovingId] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await listAllPublicSurveyResponses();
      setSurveys(res.surveys || []);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load survey responses.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // step reset helpers
  const goBackToSurveys = () => {
    setSelectedSurveyId(null);
    setSelectedUserKey(null);
    setSelectedResponseId(null);
  };
  const goBackToUsers = () => {
    setSelectedUserKey(null);
    setSelectedResponseId(null);
  };
  const goBackToSubmissions = () => {
    setSelectedResponseId(null);
  };

  /**
   * SURVEY SUMMARY TABLE DATA
   */
  const filteredSummary = useMemo(() => {
    const q = search.trim().toLowerCase();

    const summary = (surveys || []).map((s) => {
      const responses = s.responses || [];

      const totalResponses = responses.length;

      const userMap = new Map();
      responses.forEach((r) => {
        const key =
          r.userMobile || r.userCode || `unknown-${String(r.userName || "")}`;
        if (!userMap.has(key)) {
          userMap.set(key, {
            userCode: r.userCode,
            userName: r.userName,
            userMobile: r.userMobile,
          });
        }
      });
      const users = Array.from(userMap.values());

      // max createdAt
      let lastResponseAt = null;
      responses.forEach((r) => {
        if (!r.createdAt) return;
        if (!lastResponseAt) {
          lastResponseAt = r.createdAt;
        } else if (new Date(r.createdAt) > new Date(lastResponseAt)) {
          lastResponseAt = r.createdAt;
        }
      });

      return {
        surveyId: s.surveyId,
        surveyCode: s.surveyCode,
        name: s.name,
        status: s.status,
        category: s.category,
        projectName: s.projectName,
        totalResponses,
        users,
        lastResponseAt,
      };
    });

    return summary.filter((s) => {
      const statusOk =
        statusFilter === "All"
          ? true
          : String(s.status) === String(statusFilter);

      const searchOk =
        !q ||
        [s.name, s.surveyCode, s.category, s.projectName]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));

      return statusOk && searchOk;
    });
  }, [surveys, search, statusFilter]);

  const selectedSurvey =
    surveys.find((sv) => String(sv.surveyId) === String(selectedSurveyId)) ||
    null;

  const selectedResponse =
    selectedSurvey &&
    (selectedSurvey.responses || []).find(
      (r) => String(r.responseId) === String(selectedResponseId)
    );

  // Set approvalStatus for a response (PUBLIC API)
  const handleSetApproval = async (responseId, approvalStatus) => {
    try {
      setApprovingId(responseId);
      const res = await setSurveyResponseApproval(responseId, approvalStatus);
      toast.success(res?.message || "Response status updated successfully");

      // Update local state
      setSurveys((prev) =>
        (prev || []).map((sv) => ({
          ...sv,
          responses: (sv.responses || []).map((r) =>
            r.responseId === responseId
              ? {
                  ...r,
                  approvalStatus,
                  isApproved: approvalStatus === "CORRECTLY_DONE",
                }
              : r
          ),
        }))
      );
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update response status.";
      toast.error(msg);
    } finally {
      setApprovingId(null);
    }
  };

  // ---- UI ----
  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-4" style={{ color: themeColors.text }}>
            Loading survey responses...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-4 rounded-lg border"
        style={{
          borderColor: themeColors.border,
          color: themeColors.danger,
          backgroundColor: themeColors.surface,
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1
            className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2"
            style={{ color: themeColors.text }}
          >
            <FaClipboardList />
            Survey Responses
          </h1>
          <p
            className="text-sm mt-1 opacity-75"
            style={{ color: themeColors.text }}
          >
            Step by step dekho — pehle survey list, phir user wise entries, phir
            har entry ka detail (audio + map + answers).
          </p>
        </div>
      </div>

      {/* STEP 1: SURVEY LIST (jab tak survey select nahi kiya) */}
      {!selectedSurvey && (
        <>
          {/* Filters for surveys list */}
          <div
            className="rounded-xl border p-3 md:p-4 shadow-sm"
            style={{
              backgroundColor: themeColors.surface,
              borderColor: themeColors.border,
            }}
          >
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              {/* Search */}
              <div className="flex-1 relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by survey name, code, project, category"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background,
                    color: themeColors.text,
                  }}
                />
              </div>

              {/* Status filter */}
              <div className="min-w-[160px]">
                <label
                  className="text-xs mb-1 block opacity-70"
                  style={{ color: themeColors.text }}
                >
                  Survey Status
                </label>
                <select
                  className="w-full p-2 rounded-lg border text-sm"
                  style={{
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background,
                    color: themeColors.text,
                  }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>
            </div>
          </div>

          {/* Summary table */}
          <div
            className="rounded-2xl border shadow-sm overflow-hidden"
            style={{
              backgroundColor: themeColors.surface,
              borderColor: themeColors.border,
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    style={{ backgroundColor: themeColors.background + "30" }}
                  >
                    {[
                      "Survey",
                      "Code",
                      "Status",
                      "Category",
                      "Project",
                      "Total Responses",
                      "Users",
                      "Last Response",
                    ].map((head) => (
                      <th
                        key={head}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: themeColors.text }}
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody
                  className="divide-y"
                  style={{ borderColor: themeColors.border }}
                >
                  {filteredSummary.map((s) => (
                    <tr
                      key={s.surveyId}
                      className="cursor-pointer hover:bg-black/5"
                      onClick={() => {
                        setSelectedSurveyId(s.surveyId);
                        setSelectedUserKey(null);
                        setSelectedResponseId(null);
                      }}
                    >
                      {/* Survey name */}
                      <td className="px-4 py-3">
                        <div
                          className="font-medium"
                          style={{ color: themeColors.text }}
                        >
                          {s.name}
                        </div>
                        <p
                          className="text-[11px] opacity-70 mt-0.5"
                          style={{ color: themeColors.text }}
                        >
                          Click row to see user-wise entries
                        </p>
                      </td>

                      {/* Code */}
                      <td
                        className="px-4 py-3 text-xs font-mono"
                        style={{ color: themeColors.text }}
                      >
                        {s.surveyCode}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-xs">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                          style={{
                            backgroundColor:
                              s.status === "ACTIVE"
                                ? themeColors.success + "20"
                                : s.status === "DRAFT"
                                ? themeColors.primary + "20"
                                : themeColors.danger + "20",
                            color:
                              s.status === "ACTIVE"
                                ? themeColors.success
                                : s.status === "DRAFT"
                                ? themeColors.primary
                                : themeColors.danger,
                          }}
                        >
                          {s.status === "ACTIVE" && <FaPlay />}
                          {s.status === "DRAFT" && <FaRegClock />}
                          {s.status === "CLOSED" && <FaStopCircle />}
                          {s.status}
                        </span>
                      </td>

                      {/* Category */}
                      <td
                        className="px-4 py-3 text-xs"
                        style={{ color: themeColors.text }}
                      >
                        {s.category || "-"}
                      </td>

                      {/* Project */}
                      <td
                        className="px-4 py-3 text-xs"
                        style={{ color: themeColors.text }}
                      >
                        {s.projectName || "-"}
                      </td>

                      {/* Total responses */}
                      <td
                        className="px-4 py-3 text-xs font-semibold"
                        style={{ color: themeColors.primary }}
                      >
                        {s.totalResponses}
                      </td>

                      {/* Users */}
                      <td className="px-4 py-3 text-xs">
                        {(!s.users || s.users.length === 0) && (
                          <span
                            className="opacity-60"
                            style={{ color: themeColors.text }}
                          >
                            -
                          </span>
                        )}
                        {s.users && s.users.length > 0 && (
                          <span
                            className="opacity-80"
                            style={{ color: themeColors.text }}
                          >
                            {s.users.length} user
                            {s.users.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </td>

                      {/* Last response */}
                      <td
                        className="px-4 py-3 text-xs"
                        style={{ color: themeColors.text }}
                      >
                        {fmtDateTime(s.lastResponseAt)}
                      </td>
                    </tr>
                  ))}

                  {filteredSummary.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-8 text-center text-sm"
                        style={{ color: themeColors.text }}
                      >
                        No data found for current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* STEP 2 + 3 */}
      {selectedSurvey && !selectedUserKey && (
        <SurveyUserListPanel
          survey={selectedSurvey}
          themeColors={themeColors}
          onBackToSurveys={goBackToSurveys}
          onSelectUser={(key) => {
            setSelectedUserKey(key);
            setSelectedResponseId(null);
          }}
        />
      )}

      {selectedSurvey && selectedUserKey && !selectedResponseId && (
        <UserSubmissionsPanel
          survey={selectedSurvey}
          userKey={selectedUserKey}
          themeColors={themeColors}
          approvingId={approvingId}
          onSetApproval={handleSetApproval}
          onBackToUsers={goBackToUsers}
          onOpenResponse={(rid) => setSelectedResponseId(rid)}
        />
      )}

      {selectedSurvey && selectedUserKey && selectedResponseId && (
        <ResponseDetailPanel
          survey={selectedSurvey}
          response={selectedResponse}
          themeColors={themeColors}
          approvingId={approvingId}
          onSetApproval={handleSetApproval}
          onBack={goBackToSubmissions}
        />
      )}
    </div>
  );
}
