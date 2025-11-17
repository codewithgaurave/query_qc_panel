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

// --- Survey detail panel component ---
function SurveyDetailPanel({
  survey,
  themeColors,
  approvingId,
  onSetApproval,
  onClose,
}) {
  const [responseSearch, setResponseSearch] = useState("");
  const [responseFilter, setResponseFilter] = useState("ALL"); // ALL | APPROVED | NOT_APPROVED | PENDING | enum values
  const [openAudioId, setOpenAudioId] = useState(null); // which response's audio is visible

  useEffect(() => {
    // Reset filters & audio when survey changes
    setResponseSearch("");
    setResponseFilter("ALL");
    setOpenAudioId(null);
  }, [survey?.surveyId]);

  if (!survey) return null;

  const responses = survey.responses || [];

  // Stats
  const totalResponses = responses.length;
  const approvedCount = responses.filter((r) => r.isApproved).length;
  const pendingCount = responses.filter(
    (r) => (r.approvalStatus || "PENDING") === "PENDING"
  ).length;
  const rejectedCount = totalResponses - approvedCount - pendingCount;

  const byStatusCounts = responses.reduce((acc, r) => {
    const st = r.approvalStatus || "PENDING";
    acc[st] = (acc[st] || 0) + 1;
    return acc;
  }, {});

  // Filters apply
  const filteredResponses = useMemo(() => {
    let list = responses;

    if (responseFilter === "APPROVED") {
      list = list.filter((r) => r.isApproved);
    } else if (responseFilter === "NOT_APPROVED") {
      list = list.filter((r) => !r.isApproved);
    } else if (responseFilter === "PENDING") {
      list = list.filter(
        (r) => (r.approvalStatus || "PENDING") === "PENDING"
      );
    } else if (
      APPROVAL_OPTIONS.some((o) => o.value === responseFilter)
    ) {
      list = list.filter(
        (r) => (r.approvalStatus || "PENDING") === responseFilter
      );
    }

    const q = responseSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const values = [
          r.userName,
          r.userCode,
          r.userMobile,
          r.userRole,
        ]
          .filter(Boolean)
          .map((v) => String(v).toLowerCase());
        return values.some((v) => v.includes(q));
      });
    }

    // latest first
    return list.slice().sort(
      (a, b) =>
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
  }, [responses, responseFilter, responseSearch]);

  return (
    <div
      className="mt-6 rounded-2xl border shadow-sm"
      style={{
        backgroundColor: themeColors.surface,
        borderColor: themeColors.border,
      }}
    >
      {/* Header */}
      <div
        className="px-4 sm:px-6 py-4 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-3"
        style={{ borderColor: themeColors.border }}
      >
        <div>
          <p
            className="text-xs uppercase font-semibold opacity-70"
            style={{ color: themeColors.text }}
          >
            Survey details & responses
          </p>
          <h2
            className="text-lg sm:text-xl font-semibold mt-1"
            style={{ color: themeColors.text }}
          >
            {survey.name}{" "}
            <span className="text-xs font-mono opacity-70">
              ({survey.surveyCode})
            </span>
          </h2>
          <p
            className="text-[11px] mt-1 opacity-70"
            style={{ color: themeColors.text }}
          >
            Status:{" "}
            <span className="font-semibold">{survey.status}</span>
            {survey.category && ` · Category: ${survey.category}`}
            {survey.projectName && ` · Project: ${survey.projectName}`}
          </p>
        </div>

        <button
          onClick={onClose}
          className="self-start md:self-auto px-3 py-1.5 rounded-lg text-xs font-semibold border"
          style={{
            borderColor: themeColors.border,
            color: themeColors.text,
            backgroundColor: themeColors.surface,
          }}
        >
          Close details
        </button>
      </div>

      {/* Stats row */}
      <div className="px-4 sm:px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          className="rounded-xl p-3 border"
          style={{ borderColor: themeColors.border }}
        >
          <p
            className="text-[11px] opacity-70"
            style={{ color: themeColors.text }}
          >
            Total Responses
          </p>
          <p
            className="text-xl font-bold mt-1"
            style={{ color: themeColors.primary }}
          >
            {totalResponses}
          </p>
        </div>

        <div
          className="rounded-xl p-3 border"
          style={{ borderColor: themeColors.border }}
        >
          <p
            className="text-[11px] opacity-70"
            style={{ color: themeColors.text }}
          >
            Approved
          </p>
          <p
            className="text-xl font-bold mt-1"
            style={{ color: themeColors.success }}
          >
            {approvedCount}
          </p>
        </div>

        <div
          className="rounded-xl p-3 border"
          style={{ borderColor: themeColors.border }}
        >
          <p
            className="text-[11px] opacity-70"
            style={{ color: themeColors.text }}
          >
            Pending Review
          </p>
          <p
            className="text-xl font-bold mt-1"
            style={{ color: themeColors.text }}
          >
            {pendingCount}
          </p>
        </div>

        <div
          className="rounded-xl p-3 border"
          style={{ borderColor: themeColors.border }}
        >
          <p
            className="text-[11px] opacity-70"
            style={{ color: themeColors.text }}
          >
            Not Approved
          </p>
          <p
            className="text-xl font-bold mt-1"
            style={{ color: themeColors.danger }}
          >
            {rejectedCount}
          </p>
        </div>
      </div>

      {/* Per reason stats */}
      <div className="px-4 sm:px-6 pb-3 flex flex-wrap gap-2">
        {APPROVAL_OPTIONS.map((opt) => {
          const count = byStatusCounts[opt.value] || 0;
          if (!count) return null;
          const chipStyle = getApprovalChipStyle(
            opt.value,
            themeColors
          );
          return (
            <span
              key={opt.value}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px]"
              style={{
                backgroundColor: chipStyle.bg,
                color: chipStyle.color,
              }}
            >
              {opt.value === "CORRECTLY_DONE" && <FaCheckCircle />}
              {opt.label}:{" "}
              <span className="font-semibold">{count}</span>
            </span>
          );
        })}
      </div>

      {/* Filters for responses */}
      <div
        className="px-4 sm:px-6 py-3 border-t flex flex-col md:flex-row gap-3 md:items-center md:justify-between"
        style={{ borderColor: themeColors.border }}
      >
        <div className="flex-1 relative max-w-md">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60 text-xs" />
          <input
            value={responseSearch}
            onChange={(e) => setResponseSearch(e.target.value)}
            placeholder="Search responses by user name, code, mobile"
            className="w-full pl-8 pr-3 py-2 rounded-lg border text-xs"
            style={{
              borderColor: themeColors.border,
              backgroundColor: themeColors.background,
              color: themeColors.text,
            }}
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <label
            className="text-[11px] opacity-70"
            style={{ color: themeColors.text }}
          >
            Filter by response status
          </label>
          <select
            className="px-2 py-1.5 rounded-lg border text-[11px]"
            style={{
              borderColor: themeColors.border,
              backgroundColor: themeColors.background,
              color: themeColors.text,
            }}
            value={responseFilter}
            onChange={(e) => setResponseFilter(e.target.value)}
          >
            <option value="ALL">All responses</option>
            <option value="APPROVED">Approved</option>
            <option value="NOT_APPROVED">Not Approved</option>
            <option value="PENDING">Not Reviewed (Pending)</option>
            <option disabled>── By Reason ──</option>
            {APPROVAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Responses list */}
      <div className="px-4 sm:px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
        {filteredResponses.length === 0 && (
          <p
            className="text-sm opacity-75"
            style={{ color: themeColors.text }}
          >
            No responses found for current filters.
          </p>
        )}

        {filteredResponses.map((resp, idx) => {
          const status = resp.approvalStatus || "PENDING";
          const label = APPROVAL_LABELS[status] || status;
          const chipStyle = getApprovalChipStyle(
            status,
            themeColors
          );

          const answerCount = (resp.answers || []).length;
          const isAudioOpen = openAudioId === resp.responseId;

          return (
            <div
              key={resp.responseId || idx}
              className="rounded-xl border p-3 sm:p-4 space-y-3"
              style={{
                borderColor: themeColors.border,
                backgroundColor: themeColors.background,
              }}
            >
              {/* header row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p
                    className="text-xs font-semibold flex items-center gap-2"
                    style={{ color: themeColors.text }}
                  >
                    <FaUser />
                    {resp.userName || resp.userCode || "Unknown User"}
                  </p>
                  <p
                    className="text-[11px] opacity-70"
                    style={{ color: themeColors.text }}
                  >
                    {resp.userCode}
                    {resp.userMobile ? ` · ${resp.userMobile}` : ""}
                    {resp.userRole ? ` · ${resp.userRole}` : ""}
                  </p>
                  <p
                    className="text-[11px] opacity-70 mt-1"
                    style={{ color: themeColors.text }}
                  >
                    Submitted at: {fmtDateTime(resp.createdAt)}
                  </p>
                  {resp.isCompleted === false && (
                    <p
                      className="text-[11px] opacity-70"
                      style={{ color: themeColors.danger }}
                    >
                      (Incomplete response)
                    </p>
                  )}

                  {/* Approval chip */}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
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
                    {resp.isApproved && (
                      <span
                        className="text-[11px] font-semibold"
                        style={{ color: themeColors.success }}
                      >
                        (Approved)
                      </span>
                    )}
                    <span
                      className="text-[11px] opacity-70"
                      style={{ color: themeColors.text }}
                    >
                      {answerCount} answers
                    </span>
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex flex-col sm:items-end gap-2 min-w-[220px]">
                  {resp.audioUrl && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenAudioId((prev) =>
                            prev === resp.responseId ? null : resp.responseId
                          )
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[11px] font-semibold self-start sm:self-auto"
                        style={{
                          borderColor: themeColors.primary,
                          color: themeColors.primary,
                          backgroundColor: themeColors.surface,
                        }}
                      >
                        <FaHeadphones />
                        {isAudioOpen ? "Hide Audio" : "Listen Audio"}
                      </button>

                      {isAudioOpen && (
                        <audio
                          controls
                          autoPlay
                          className="w-full mt-2"
                          src={resp.audioUrl}
                        >
                          Your browser does not support the audio element.
                        </audio>
                      )}
                    </>
                  )}

                  <div className="flex flex-col gap-1 w-full">
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
                      disabled={approvingId === resp.responseId}
                      onChange={(e) =>
                        onSetApproval(resp.responseId, e.target.value)
                      }
                    >
                      {APPROVAL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {approvingId === resp.responseId && (
                      <span
                        className="text-[11px] opacity-70"
                        style={{ color: themeColors.text }}
                      >
                        Updating status...
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* divider */}
              <hr
                className="border-t my-1"
                style={{ borderColor: themeColors.border }}
              />

              {/* Q&A */}
              <div className="mt-1 space-y-3">
                {(resp.answers || []).map((a, qIndex) => {
                  let answerText = "-";

                  if (a.questionType === "OPEN_ENDED") {
                    answerText = a.answerText || "-";
                  } else if (a.questionType === "RATING") {
                    answerText =
                      typeof a.rating === "number"
                        ? String(a.rating)
                        : "-";
                  } else {
                    const opts = a.selectedOptions || [];
                    answerText =
                      opts.length > 0 ? opts.join(", ") : "-";
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
                          <span className="font-semibold">
                            Answer:{" "}
                          </span>
                          {answerText}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SurveyResponses() {
  const { themeColors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Backend se direct full data
  const [surveys, setSurveys] = useState([]); // [{ surveyId, ..., responses: [...] }]

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // which survey is currently selected for detail panel
  const [selectedSurveyId, setSelectedSurveyId] = useState(null);

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

  /**
   * Summary rows derive from full surveys data:
   * - totalResponses
   * - unique users list
   * - lastResponseAt
   */
  const filteredSummary = useMemo(() => {
    const q = search.trim().toLowerCase();

    const summary = (surveys || []).map((s) => {
      const responses = s.responses || [];

      const totalResponses = responses.length;

      // unique users by userCode
      const userMap = new Map();
      responses.forEach((r) => {
        if (!r.userCode) return;
        if (!userMap.has(r.userCode)) {
          userMap.set(r.userCode, {
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

  const selectedSurveyDetail =
    surveys.find(
      (sv) => String(sv.surveyId) === String(selectedSurveyId)
    ) || null;

  // Set approvalStatus for a response (PUBLIC API)
  const handleSetApproval = async (responseId, approvalStatus) => {
    try {
      setApprovingId(responseId);
      const res = await setSurveyResponseApproval(responseId, approvalStatus);
      toast.success(res?.message || "Response status updated successfully");

      // Update local state: set approvalStatus + derived isApproved
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
            Dekho kaun-kaun se surveys pe kitne responses aaye, filter karo
            approval ke hisaab se, aur detail answers + audio review karo.
          </p>
        </div>
      </div>

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
              <tr style={{ backgroundColor: themeColors.background + "30" }}>
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
                  onClick={() => setSelectedSurveyId(s.surveyId)}
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
                      Click row to view responses & stats
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

      {/* Survey detail + response filters + stats */}
      {selectedSurveyDetail && (
        <SurveyDetailPanel
          survey={selectedSurveyDetail}
          themeColors={themeColors}
          approvingId={approvingId}
          onSetApproval={handleSetApproval}
          onClose={() => setSelectedSurveyId(null)}
        />
      )}
    </div>
  );
}
