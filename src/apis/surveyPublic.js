// src/apis/surveyPublic.js
import http from "./http";

/**
 * GET /survey/qc/responses/assigned
 * Sabhi surveys + unke saare responses + user + approval info jisme ye QC assigned hai
 */
export const listAllPublicSurveyResponses = async () => {
  const { data } = await http.get("/survey/qc/responses/assigned");
  return data; // { surveys: [...] }
};

/**
 * PATCH /survey/responses/:responseId/approval   ⬅️ QE protected route
 * body: { approvalStatus: string }
 */
export const setSurveyResponseApproval = async (
  responseId,
  approvalStatus
) => {
  const { data } = await http.patch(
    `/survey/responses/${responseId}/approval`,
    { approvalStatus }
  );
  return data; // { message, response }
};
