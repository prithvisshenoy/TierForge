import {
  Box,
  Paper,
  Typography,
} from "@mui/material";

function TierBreakdown({ counts }) {
  return (
    <Paper elevation={0} className="dashboard-section">
      <Typography variant="h5" className="section-title">
        Tier Breakdown
      </Typography>

      <Typography className="section-description">
        Distribution of enriched stores across the calculated
        tiers.
      </Typography>

      <Box className="count-grid">
        <TierCard
          label="Large"
          value={counts.large}
        />

        <TierCard
          label="Medium"
          value={counts.medium}
        />

        <TierCard
          label="Small"
          value={counts.small}
        />
      </Box>
    </Paper>
  );
}

function TierCard({ label, value }) {
  return (
    <Box className="count-card">
      <Typography className="count-value">
        {value}
      </Typography>

      <Typography className="count-label">
        {label}
      </Typography>
    </Box>
  );
}

export default TierBreakdown;