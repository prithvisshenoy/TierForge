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

function UploadScreen({
  file,
  error,
  progress,
  isUploading,
  onFileChange,
  onUpload,
}) {
  const handleFileInput = (event) => {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      onFileChange(selectedFile);
    }
  };

  const percentage = progress?.progress?.percentage ?? 0;

  const totalRecords = progress?.progress?.total_records ?? 0;
  const successfulRecords =
    progress?.progress?.successful_records ?? 0;
  const failedRecords =
    progress?.progress?.failed_records ?? 0;

  const processedRecords = successfulRecords + failedRecords;

  return (
    <Container maxWidth="md" className="upload-page">
      <Paper elevation={0} className="upload-card">
        <Box className="upload-icon">
          <CloudUploadOutlinedIcon />
        </Box>

        <Typography variant="h4" className="upload-title">
          Upload Store Data
        </Typography>

        <Typography className="upload-description">
          Upload a CSV file containing your store information to
          begin enrichment and tier classification.
        </Typography>

        <Button
          component="label"
          variant="outlined"
          className="choose-file-button"
          fullWidth
        >
          Choose CSV File

          <input
            hidden
            type="file"
            accept=".csv"
            onChange={handleFileInput}
          />
        </Button>

        {file && (
          <Typography className="selected-file">
            {file.name}
          </Typography>
        )}

        {error && (
          <Typography className="error-message">
            {error}
          </Typography>
        )}

        {isUploading && (
          <Box className="upload-progress">
            <Stack spacing={1}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="body2">
                  Processing file...
                </Typography>

                <Typography
                  variant="body2"
                  fontWeight={600}
                  color="var(--accent)"
                >
                  {percentage}%
                </Typography>
              </Box>

              <LinearProgress
                variant="determinate"
                value={percentage}
              />

              <Typography
                variant="body2"
                color="var(--text)"
              >
                {processedRecords} of{" "}
                {totalRecords} records processed
              </Typography>
            </Stack>
          </Box>
        )}

        <Button
          variant="contained"
          disabled={!file || isUploading}
          onClick={onUpload}
          className="submit-button"
          fullWidth
        >
          {isUploading ? "Processing..." : "Submit"}
        </Button>
      </Paper>
    </Container>
  );
}

export default UploadScreen;