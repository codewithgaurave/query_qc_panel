// src/apis/auth.js
import http from "./http";

// ---- QUALITY ENGINEER LOGIN ONLY ----
// POST /user/login/quality-engineer
// Body: { mobile, password }
// Response: { message, user, token }
export const userLogin = async ({ mobile, password }) => {
  const { data } = await http.post("/user/login/quality-engineer", {
    mobile,
    password,
  });
  return data; // { message, user, token }
};
