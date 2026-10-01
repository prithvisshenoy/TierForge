import { useState } from "react";
import {
  Box,
  Button,
  Container,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import { REQUIRED_CSV_HEADERS } from "./constants";
import Papa from "papaparse";
import {uploadFile, getJobStatus} from "../api/apiService";

import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
   
    if (!selectedFile) return;
   
    if (selectedFile) {
      setFile(selectedFile);
    }

     Papa.parse(selectedFile, {
      preview: 1, 
      header: true,
      complete: (results) => {
        const uploadedColumns = results.meta.fields || [];

        const missingColumns = REQUIRED_CSV_HEADERS.filter(
          (col) => !uploadedColumns.includes(col?.toLowerCase())
        );

        if (missingColumns.length > 0) {
          setError(`Missing required columns: ${missingColumns.join(', ')}`);
          setSuccess(false);
        } else {
          setError('');
          setSuccess(true);
        }
      },
    });
  };

  const pollJobStatus = async (jobId) => {
    try {
      const data = await getJobStatus(jobId);

      setProgress(data);

      const percentage = data.progress?.percentage ?? 0;

      const isCompleted =
        data.status === "COMPLETED" ||
        percentage >= 100;

      const isFailed =
        data.status === "FAILED" ||
        data.status === "ERROR";

      if (isCompleted || isFailed) {
        setIsUploading(false);
        return;
      }

      setTimeout(() => {
        pollJobStatus(jobId);
      }, 1000);

    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.detail ||
        "Unable to fetch job status"
      );

      setIsUploading(false);
    }
  };

  const handleSubmit = async() => {
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);
      setProgress(null);

      const data = await uploadFile(file);

      const jobId = data.job_id;

      setJobId(jobId);

      pollJobStatus(jobId);
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.detail ||
        "Unable to upload file"
      );

      setIsUploading(false);
    }
  };

  return (
    <main id="upload-page">
      <Container maxWidth="sm">
        <Paper className="upload-card" elevation={0}>
          <Stack spacing={3} alignItems="center" sx={{alignItems: "center"}}>
            <div className="upload-icon">
              <CloudUploadOutlinedIcon />
            </div>

            <div>
              <Typography className="upload-title">
                Upload your file
              </Typography>

              <Typography className="upload-description">
                Select a file from your device to get started.
              </Typography>
            </div>

            <Button
              component="label"
              variant="outlined"
              className="upload-button"
              fullWidth
              disabled={isUploading}
              startIcon={<CloudUploadOutlinedIcon />}
            >
              {file ? "Choose a different file" : "Choose file"}

              <input
                type="file"
                hidden
                onChange={handleFileChange}
                accept=".csv"
              />

              {error && <p style={{ color: 'red' }}>{error}</p>}
            </Button>

            {file && (
              <Box className="selected-file">
                <Typography className="selected-file-label">
                  Selected file
                </Typography>

                <Typography className="selected-file-name">
                  {file.name}
                </Typography>
              </Box>
            )}

            {isUploading && progress && (
              <Box className="progress-section">

                <Box className="progress-header">
                  <Typography className="progress-title">
                    Processing file
                  </Typography>

                  <Typography className="progress-percentage">
                    {progress.progress.percentage.toFixed(1)}%
                  </Typography>
                </Box>

                <LinearProgress
                  variant="determinate"
                  value={progress.progress.percentage}
                  className="progress-bar"
                />

                <Typography className="progress-status">
                  Processing{" "}
                  {progress.progress.successful_records +
                    progress.progress.failed_records}{" "}
                  of {progress.progress.total_records} records
                </Typography>

              </Box>
            )}

            {error && (
              <Typography className="error-message">
                {error}
              </Typography>
            )}

            <Button
              variant="contained"
              className="submit-button"
              fullWidth
              disabled={!file || isUploading}
              onClick={handleSubmit}
            >
              {isUploading ? "Processing..." : "Submit"}
            </Button>

            {!isUploading && progress?.progress?.percentage >= 100 && (
              <Box className="result-section">
                <Typography className="result-title">
                  Processing complete
                </Typography>

                <Typography className="result-details">
                  {progress.progress.successful_records} successful
                  {" • "}
                  {progress.progress.failed_records} failed
                </Typography>
              </Box>
            )}

          </Stack>
        </Paper>
      </Container>
    </main>
  );
}

export default App;