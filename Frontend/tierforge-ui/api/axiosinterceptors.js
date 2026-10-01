import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token here later if required

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Centralized error handling
    console.error("API Error:", error);

    return Promise.reject(error);
  }
);

export default api;
