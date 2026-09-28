// src/apis/surveyPublic.js
import http from "./http";

/**
 * GET /survey/qc/responses/assigned
 * Sabhi surveys + unke saare responses + user + approval info jisme ye QC assigned hai
 */
export const listAllPublicSurveyResponses = async (params = {}) => {
  const queryParams = typeof params === "string" ? { date: params } : params;
  const { data } = await http.get("/survey/qc/responses/assigned", {
    params: queryParams,
  });
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

/**
 * GET /survey/qc/responses/:responseId  ⬅️ QE single response detail on demand
 */
export const getSurveyResponseDetail = async (responseId) => {
  const { data } = await http.get(`/survey/qc/responses/${responseId}`);
  return data; // { response: { answers, ... } }
};

