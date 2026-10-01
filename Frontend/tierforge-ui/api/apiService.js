import api from "./axiosinterceptors";
import { uploadApi, tierApi, jobPollApi } from "./apiEndpoints";

export const uploadFile = async (file) => {
  const formData = new FormData();

  formData.append("file", file);

  const response = await api.post(
    uploadApi,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};

export const getJobStatus = async (jobId) => {
  const response = await api.get(
    jobPollApi+jobId
  );

  return response.data;
};

export const getTiers = async (payload) => { 
    const response = await api.post(tierApi, payload ); 
        
    return response.data; 
};