import {
  Box,
  Button,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

function JobOverview({
  jobId,
  fileName,
  progress,
  onNewUpload,
}) {
  const jobProgress = progress?.progress || {};

  return (
    <Paper elevation={0} className="dashboard-section">
      <Box className="section-header">
        <Box>
          <Typography variant="h5" className="section-title">
            Job Overview
          </Typography>

          <Typography className="section-description">
            Job #{jobId}
            {fileName ? ` · ${fileName}` : ""}
          </Typography>
        </Box>

        <Button
          variant="outlined"
          onClick={onNewUpload}
          className="new-upload-button"
        >
          Upload New File
        </Button>
      </Box>

      <Box className="status-grid">
        <StatusCard
          label="Total Records"
          value={jobProgress.total_records ?? 0}
        />

        <StatusCard
          label="Stores Enriched"
          value={jobProgress.successful_records ?? 0}
        />

        <StatusCard
          label="Failed"
          value={jobProgress.failed_records ?? 0}
        />

        <StatusCard
          label="Pending"
          value={jobProgress.pending_records ?? 0}
        />
      </Box>
    </Paper>
  );
}

function StatusCard({ label, value }) {
  return (
    <Box className="status-card">
      <Typography className="status-value">
        {value}
      </Typography>

      <Typography className="status-label">
        {label}
      </Typography>
    </Box>
  );
}

export default JobOverview;