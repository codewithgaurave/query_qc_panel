// src/apis/http.js
import axios from "axios";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach QE token for every request
http.interceptors.request.use((config) => {
  // 🔥 Sirf QE ka token (user-token) use karenge
  const userToken = localStorage.getItem("user-token");

  if (userToken) {
    config.headers.Authorization = `Bearer ${userToken}`;
  } else {
    // Optional: agar token hi nahi hai to header hata do
    delete config.headers.Authorization;
  }

  return config;
});

export default http;
