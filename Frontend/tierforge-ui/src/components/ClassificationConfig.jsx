import {
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

const METRICS = [
  {
    key: "footfall",
    label: "Footfall",
  },
  {
    key: "revenue",
    label: "Revenue",
  },
  {
    key: "size",
    label: "Size",
  },
];

function ClassificationConfig({
  bars,
  weights,
  tierThresholds,
  totalWeight,
  isWeightValid,
  areThresholdsValid,
  isValid,
  isLoading,
  error,
  onBarChange,
  onWeightChange,
  onThresholdChange,
  onRecalculate,
}) {
  return (
    <Paper elevation={0} className="dashboard-section">
      <Typography variant="h5" className="section-title">
        Classification Configuration
      </Typography>

      <Typography className="section-description">
        Adjust the metric bars, weights, and tier thresholds,
        then recalculate the store tiers.
      </Typography>

      <Box className="classification-config">
        <Box className="input-header">
          <Typography className="metric-header">
            Metric
          </Typography>

          <Typography className="metric-header">
            Bar
          </Typography>

          <Typography className="metric-header">
            Weight (%)
          </Typography>
        </Box>

        {METRICS.map((metric) => (
          <Box className="metric-row" key={metric.key}>
            <Typography className="metric-name">
              {metric.label}
            </Typography>

            <TextField
              size="small"
              type="number"
              value={bars[metric.key]}
              onChange={onBarChange(metric.key)}
              inputProps={{ min: 0 }}
              placeholder="Enter bar"
            />

            <TextField
              size="small"
              type="number"
              value={weights[metric.key]}
              onChange={onWeightChange(metric.key)}
              inputProps={{
                min: 0,
                max: 100,
              }}
              placeholder="Enter weight"
            />
          </Box>
        ))}
      </Box>

      <Box className="threshold-section">
        <Typography className="subsection-title">
          Tier Thresholds
        </Typography>

        <Box className="threshold-grid">
          <TextField
            label="Large Tier Threshold"
            size="small"
            type="number"
            value={tierThresholds.large}
            onChange={onThresholdChange("large")}
            inputProps={{
              min: 0,
              max: 100,
            }}
          />

          <TextField
            label="Medium Tier Threshold"
            size="small"
            type="number"
            value={tierThresholds.medium}
            onChange={onThresholdChange("medium")}
            inputProps={{
              min: 0,
              max: 100,
            }}
          />
        </Box>
      </Box>

      <Box className="configuration-footer">
        <Stack spacing={0.5}>
          <Typography
            className={
              isWeightValid
                ? "validation-success"
                : "validation-error"
            }
          >
            Total Weight: {totalWeight}%
          </Typography>

          {!isWeightValid && (
            <Typography className="validation-error">
              Metric weights must add up to 100%.
            </Typography>
          )}

          {!areThresholdsValid && (
            <Typography className="validation-error">
              Large threshold must be greater than Medium
              threshold, and both must be between 0 and 100.
            </Typography>
          )}

          {error && (
            <Typography className="validation-error">
              {error}
            </Typography>
          )}
        </Stack>

        <Button
          variant="contained"
          disabled={!isValid || isLoading}
          onClick={onRecalculate}
          className="recalculate-button"
        >
          {isLoading
            ? "Calculating..."
            : "Recalculate Tiers"}
        </Button>
      </Box>
    </Paper>
  );
}

export default ClassificationConfig;