import api from "./axiosinterceptors";
import { uploadApi, tierApi, jobPollApi } from "./apiEndpoints";

const getErrorMessage = (error, fallbackMessage) => {
  const detail = error.response?.data?.detail;

  // FastAPI: detail is a simple string
  if (typeof detail === "string") {
    return detail;
  }

  // FastAPI validation error: detail is an array
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => item.msg)
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(", ");
    }
  }

  // Generic API message
  if (typeof error.response?.data?.message === "string") {
    return error.response.data.message;
  }

  // Network/server error
  if (!error.response) {
    return "Unable to connect to the server. Please try again.";
  }

  return error;
};

export const uploadFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post(uploadApi, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Upload failed:", error);

    throw new Error(
      getErrorMessage(error, "Failed to upload file. Please try again.")
    );
  }
};

export const getJobStatus = async (jobId) => {
  try {
    const response = await api.get(jobPollApi + jobId);

    return response.data;
  } catch (error) {
    console.error("Failed to fetch job status:", error);

    throw new Error(
      getErrorMessage(error, "Failed to fetch job status. Please try again.")
    );
  }
};

export const getTiers = async (payload) => {
  try {
    const response = await api.post(tierApi, payload);

    return response.data;
  } catch (error) {
    console.error("Tier calculation failed:", error);

    throw new Error(
      getErrorMessage(
        error,
        "Failed to calculate store tiers. Please try again."
      )
    );
  }
};