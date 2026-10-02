import { useState } from "react";
import {
  Box,
  Button,
  Container,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import SearchIcon from "@mui/icons-material/Search";
import Papa from "papaparse";

import { REQUIRED_CSV_HEADERS } from "./constants";
import {
  uploadFile,
  getJobStatus,
  getTiers,
} from "../api/apiService";

import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingStores, setIsLoadingStores] = useState(false);

  const [bars, setBars] = useState({
    footfall: "",
    revenue: "",
    size: "",
  });

  const [weights, setWeights] = useState({
    footfall: "",
    revenue: "",
    size: "",
  });

  const [stores, setStores] = useState([]);

  const [storeCounts, setStoreCounts] = useState({
    large: 0,
    medium: 0,
    small: 0,
  });

  const [tierThresholds, setTierThresholds] = useState({
    large: "",
    medium: "",
  });

  const [showDashboard, setShowDashboard] = useState(false);

  const [selectedTier, setSelectedTier] = useState("ALL");

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    setError("");
    setSuccess(false);
    setProgress(null);
    setJobId(null);
    setShowDashboard(false);
    setStores([]);
    setSelectedTier("ALL");

    setStoreCounts({
      large: 0,
      medium: 0,
      small: 0,
    });

    setFile(selectedFile);

    Papa.parse(selectedFile, {
      preview: 1,
      header: true,

      complete: (results) => {
        const uploadedColumns = (results.meta.fields || []).map(
          (column) => column.trim().toLowerCase()
        );

        const missingColumns = REQUIRED_CSV_HEADERS.filter(
          (column) =>
            !uploadedColumns.includes(
              column.trim().toLowerCase()
            )
        );

        if (missingColumns.length > 0) {
          setError(
            `Missing required columns: ${missingColumns.join(
              ", "
            )}`
          );
          setSuccess(false);
          return;
        }

        setError("");
        setSuccess(true);
      },

      error: () => {
        setError("Unable to read the CSV file.");
        setSuccess(false);
      },
    });
  };

  const pollJobStatus = async (id) => {
    try {
      const data = await getJobStatus(id);

      setProgress(data);

      const percentage = data.progress?.percentage ?? 0;

      const isCompleted =
        data.status === "COMPLETED" ||
        percentage >= 100;

      const isFailed =
        data.status === "FAILED" ||
        data.status === "ERROR";

      if (isCompleted) {
        setIsUploading(false);
        return;
      }

      if (isFailed) {
        setIsUploading(false);

        setError(
          data.message ||
            data.error ||
            "File processing failed."
        );

        return;
      }

      setTimeout(() => {
        pollJobStatus(id);
      }, 7000);
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.detail ||
          "Unable to fetch job status"
      );

      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!file || !success) {
      return;
    }

    try {
      setIsUploading(true);
      setError("");
      setProgress(null);

      const data = await uploadFile(file);

      const newJobId = data.job_id;

      setJobId(newJobId);

      pollJobStatus(newJobId);
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.detail ||
          "Unable to upload file"
      );

      setIsUploading(false);
    }
  };


  const handleBarChange = (field) => (event) => {
    setBars((previous) => ({
      ...previous,
      [field]: event.target.value,
    }));
  };

  const handleWeightChange = (field) => (event) => {
    setWeights((previous) => ({
      ...previous,
      [field]: event.target.value,
    }));
  };

  const handleThresholdChange = (field) => (event) => {
    setTierThresholds((previous) => ({
      ...previous,
      [field]: event.target.value,
    }));
  };

  const totalWeight =
    Number(weights.footfall || 0) +
    Number(weights.revenue || 0) +
    Number(weights.size || 0);

  const isWeightValid = totalWeight === 100;

  const areThresholdsValid =
    tierThresholds.large !== "" &&
    tierThresholds.medium !== "" &&
    Number(tierThresholds.large) >= 0 &&
    Number(tierThresholds.large) <= 100 &&
    Number(tierThresholds.medium) >= 0 &&
    Number(tierThresholds.medium) <= 100 &&
    Number(tierThresholds.large) >
      Number(tierThresholds.medium);

  const areClassificationInputsValid =
    bars.footfall !== "" &&
    bars.revenue !== "" &&
    bars.size !== "" &&
    weights.footfall !== "" &&
    weights.revenue !== "" &&
    weights.size !== "" &&
    Number(bars.footfall) >= 0 &&
    Number(bars.revenue) >= 0 &&
    Number(bars.size) >= 0 &&
    Number(weights.footfall) >= 0 &&
    Number(weights.revenue) >= 0 &&
    Number(weights.size) >= 0 &&
    isWeightValid &&
    areThresholdsValid;


  const handleShowStores = async () => {
    if (!jobId) {
      setError("Job ID is missing.");
      return;
    }

    if (!areClassificationInputsValid) {
      setError(
        "Please provide all values, ensure weights total 100%, and ensure the Large threshold is greater than the Medium threshold."
      );
      return;
    }

    try {
      setIsLoadingStores(true);
      setError("");

      const payload = {
        job_id: jobId,

        footfall_bar: Number(bars.footfall),
        footfall_weight: Number(weights.footfall),

        revenue_bar: Number(bars.revenue),
        revenue_weight: Number(weights.revenue),

        size_bar: Number(bars.size),
        size_weight: Number(weights.size),

        large_tier_threshold: Number(
          tierThresholds.large
        ),
        medium_tier_threshold: Number(
          tierThresholds.medium
        ),
      };

      const data = await getTiers(payload);

      setStores(data.stores || []);

      setStoreCounts({
        large: data.tier_breakdown?.large || 0,
        medium: data.tier_breakdown?.medium || 0,
        small: data.tier_breakdown?.small || 0,
      });

      setShowDashboard(true);
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.detail ||
          "Unable to calculate store tiers."
      );
    } finally {
      setIsLoadingStores(false);
    }
  };

  const handleNewUpload = () => {
    setFile(null);
    setError("");
    setSuccess(false);

    setJobId(null);
    setProgress(null);

    setIsUploading(false);
    setIsLoadingStores(false);

    setBars({
      footfall: "",
      revenue: "",
      size: "",
    });

    setWeights({
      footfall: "",
      revenue: "",
      size: "",
    });

    setTierThresholds({
      large: "",
      medium: "",
    });

    setStores([]);

    setStoreCounts({
      large: 0,
      medium: 0,
      small: 0,
    });

    setSelectedTier("ALL");
    setShowDashboard(false);
  };

  const processingComplete =
    progress?.status === "COMPLETED" ||
    progress?.progress?.percentage >= 100;


  const filteredStores =
    selectedTier === "ALL"
      ? stores
      : stores.filter(
          (store) =>
            store.tier?.toUpperCase() === selectedTier
        );

  const failedRecords = progress?.progress?.failed_records_details 


  if (!processingComplete) {
    return (
      <main id="upload-page">
        <Container maxWidth="sm">
          <Paper
            className="upload-card"
            elevation={0}
          >
            <Stack spacing={3} alignItems="center" sx={{alignItems: "center"}}>
              <div className="upload-icon">
                <CloudUploadOutlinedIcon />
              </div>

              <div>
                <Typography className="upload-title">
                  Upload your file
                </Typography>

                <Typography className="upload-description">
                  Select a CSV file from your device to
                  get started.
                </Typography>
              </div>

              <Button
                component="label"
                variant="outlined"
                className="upload-button"
                fullWidth
                disabled={isUploading}
                startIcon={
                  <CloudUploadOutlinedIcon />
                }
              >
                {file
                  ? "Choose a different file"
                  : "Choose file"}

                <input
                  type="file"
                  hidden
                  onChange={handleFileChange}
                  accept=".csv"
                />
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

              {success && !isUploading && (
                <Typography className="success-message">
                  CSV file is valid and ready to upload.
                </Typography>
              )}

              {isUploading && progress && (
                <Box className="progress-section">
                  <Box className="progress-header">
                    <Typography className="progress-title">
                      Processing file
                    </Typography>

                    <Typography className="progress-percentage">
                      {(
                        progress.progress?.percentage ||
                        0
                      ).toFixed(1)}
                      %
                    </Typography>
                  </Box>

                  <LinearProgress
                    variant="determinate"
                    value={
                      progress.progress?.percentage ||
                      0
                    }
                    className="progress-bar"
                  />

                  <Typography className="progress-status">
                    Processing{" "}
                    {(progress.progress
                      ?.successful_records || 0) +
                      (progress.progress
                        ?.failed_records || 0)}{" "}
                    of{" "}
                    {progress.progress
                      ?.total_records || 0}{" "}
                    records
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
                disabled={
                  !file ||
                  !success ||
                  isUploading
                }
                onClick={handleSubmit}
              >
                {isUploading
                  ? "Processing..."
                  : "Submit"}
              </Button>
            </Stack>
          </Paper>
        </Container>
      </main>
    );
  }
  if (showDashboard) {
    const totalRecords =
      progress?.progress?.total_records || 0;

    const successfulRecords =
      progress?.progress?.successful_records || 0;

    const failedRecordCount =
      progress?.progress?.failed_records || 0;

    const pendingRecords =
      progress?.progress?.pending_records || 0;

    return (
      <main id="dashboard-page">
        <Container maxWidth="xl">
          <Box className="results-container">
            <Box className="results-header">
              <Box>
                <Typography className="section-title">
                  TierForge
                </Typography>

                <Typography className="section-description">
                  Job #{jobId} • {file?.name}
                </Typography>
              </Box>

              <Button
                variant="outlined"
                className="new-upload-button"
                onClick={handleNewUpload}
              >
                Upload New File
              </Button>
            </Box>

            <Box className="dashboard-section">
              <Typography className="dashboard-section-title">
                Job Status
              </Typography>

              <Box className="status-grid">
                <Paper
                  className="status-card"
                  elevation={0}
                >
                  <Typography className="status-value">
                    {totalRecords}
                  </Typography>

                  <Typography className="status-label">
                    Total Records
                  </Typography>
                </Paper>

                <Paper
                  className="status-card successful"
                  elevation={0}
                >
                  <Typography className="status-value">
                    {successfulRecords}
                  </Typography>

                  <Typography className="status-label">
                    Stores Enriched
                  </Typography>
                </Paper>

                <Paper
                  className="status-card failed"
                  elevation={0}
                >
                  <Typography className="status-value">
                    {failedRecordCount}
                  </Typography>

                  <Typography className="status-label">
                    Failed
                  </Typography>
                </Paper>

                <Paper
                  className="status-card pending"
                  elevation={0}
                >
                  <Typography className="status-value">
                    {pendingRecords}
                  </Typography>

                  <Typography className="status-label">
                    Pending
                  </Typography>
                </Paper>
              </Box>
            </Box>

            {failedRecordCount > 0 && (
              <Box className="dashboard-section">
                <Box className="section-heading-row">
                  <Box>
                    <Typography className="dashboard-section-title">
                      Failed Records
                    </Typography>

                    <Typography className="dashboard-section-description">
                      Records that could not be enriched.
                    </Typography>
                  </Box>
                </Box>

                {failedRecords.length > 0 ? (
                  <Paper
                    className="failure-card"
                    elevation={0}
                  >
                    <Box className="failure-table-wrapper">
                      <table className="failure-table">
                        <thead>
                          <tr>
                            <th>Store ID</th>
                            <th>Store Name</th>
                            <th>Reason</th>
                          </tr>
                        </thead>

                        <tbody>
                          {failedRecords.map(
                            (record, index) => (
                              <tr
                                key={
                                  record.store_id 
                                }
                              >
                                <td>
                                  {record.store_id}
                                </td>

                                <td>
                                  {record.store_name}
                                </td>

                                <td className="failure-reason">
                                  {record.failure_reason }
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </Box>
                  </Paper>
                ) : (
                  <Paper
                    className="failure-card"
                    elevation={0}
                  >
                    <Typography className="no-failure-details">
                      {failedRecordCount} record
                      {failedRecordCount !== 1
                        ? "s"
                        : ""}{" "}
                      failed, but failure details were
                      not returned by the API.
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}

            <Box className="dashboard-section">
              <Typography className="dashboard-section-title">
                Tier Breakdown
              </Typography>

              <Box className="count-grid">
                <Paper
                  className="count-card"
                  elevation={0}
                >
                  <Typography className="count-value">
                    {storeCounts.large}
                  </Typography>

                  <Typography className="count-label">
                    Large Stores
                  </Typography>
                </Paper>

                <Paper
                  className="count-card"
                  elevation={0}
                >
                  <Typography className="count-value">
                    {storeCounts.medium}
                  </Typography>

                  <Typography className="count-label">
                    Medium Stores
                  </Typography>
                </Paper>

                <Paper
                  className="count-card"
                  elevation={0}
                >
                  <Typography className="count-value">
                    {storeCounts.small}
                  </Typography>

                  <Typography className="count-label">
                    Small Stores
                  </Typography>
                </Paper>
              </Box>
            </Box>

            <Box className="dashboard-section">
              <Box className="store-list-header">
                <Box>
                  <Typography className="dashboard-section-title">
                    Store List
                  </Typography>

                  <Typography className="dashboard-section-description">
                    {filteredStores.length} store
                    {filteredStores.length !== 1
                      ? "s"
                      : ""}{" "}
                    displayed
                  </Typography>
                </Box>

                <FormControl
                  size="small"
                  className="tier-filter"
                >
                  <InputLabel id="tier-filter-label">
                    Filter by tier
                  </InputLabel>

                  <Select
                    labelId="tier-filter-label"
                    value={selectedTier}
                    label="Filter by tier"
                    onChange={(event) =>
                      setSelectedTier(
                        event.target.value
                      )
                    }
                  >
                    <MenuItem value="ALL">
                      All Stores
                    </MenuItem>

                    <MenuItem value="LARGE">
                      Large
                    </MenuItem>

                    <MenuItem value="MEDIUM">
                      Medium
                    </MenuItem>

                    <MenuItem value="SMALL">
                      Small
                    </MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Paper
                className="table-card"
                elevation={0}
              >
                <Box className="store-table-wrapper">
                  <table className="store-table">
                    <thead>
                      <tr>
                        <th>Store ID</th>
                        <th>Store Name</th>
                        <th>Footfall</th>
                        <th>Revenue</th>
                        <th>Size (sqft)</th>
                        <th>Score</th>
                        <th>Tier</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredStores.length > 0 ? (
                        filteredStores.map(
                          (store) => (
                            <tr
                              key={store.store_id}
                            >
                              <td>
                                {store.store_id}
                              </td>

                              <td>
                                {store.store_name}
                              </td>

                              <td>
                                {Number(
                                  store.metrics
                                    ?.footfall || 0
                                ).toLocaleString()}
                              </td>

                              <td>
                                {Number(
                                  store.metrics
                                    ?.revenue || 0
                                ).toLocaleString(
                                  undefined,
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }
                                )}
                              </td>

                              <td>
                                {Number(
                                  store.metrics
                                    ?.size_sqft || 0
                                ).toLocaleString()}
                              </td>

                              <td>
                                {
                                  store.score_percentage
                                }
                                %
                              </td>

                              <td>
                                <span
                                  className={`category-badge ${(
                                    store.tier || ""
                                  ).toLowerCase()}`}
                                >
                                  {store.tier}
                                </span>
                              </td>
                            </tr>
                          )
                        )
                      ) : (
                        <tr>
                          <td
                            colSpan={7}
                            className="empty-table"
                          >
                            No stores found for the
                            selected tier.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </Box>
              </Paper>
            </Box>

          </Box>
        </Container>
      </main>
    );
  }

  return (
    <main id="classification-page">
      <Container maxWidth="md">
        <Paper
          className="classification-card"
          elevation={0}
        >
          <Stack spacing={3}>
            <Box>
              <Typography className="section-title">
                Configure Store Classification
              </Typography>

              <Typography className="section-description">
                Enter the threshold and weight for each
                metric used to calculate the store score.
              </Typography>
            </Box>

            <Box className="input-header">
              <span>Metric</span>
              <span>Threshold / Bar</span>
              <span>Weight (%)</span>
            </Box>

            <Box className="metric-row">
              <Typography className="metric-name">
                Footfall
              </Typography>

              <TextField
                fullWidth
                type="number"
                size="small"
                label="Footfall bar"
                value={bars.footfall}
                onChange={handleBarChange("footfall")}
                inputProps={{ min: 0 }}
              />

              <TextField
                fullWidth
                type="number"
                size="small"
                label="Weight"
                value={weights.footfall}
                onChange={handleWeightChange(
                  "footfall"
                )}
                inputProps={{
                  min: 0,
                  max: 100,
                }}
              />
            </Box>

            <Box className="metric-row">
              <Typography className="metric-name">
                Revenue
              </Typography>

              <TextField
                fullWidth
                type="number"
                size="small"
                label="Revenue bar"
                value={bars.revenue}
                onChange={handleBarChange("revenue")}
                inputProps={{ min: 0 }}
              />

              <TextField
                fullWidth
                type="number"
                size="small"
                label="Weight"
                value={weights.revenue}
                onChange={handleWeightChange(
                  "revenue"
                )}
                inputProps={{
                  min: 0,
                  max: 100,
                }}
              />
            </Box>

            <Box className="metric-row">
              <Typography className="metric-name">
                Size (in sqft)
              </Typography>

              <TextField
                fullWidth
                type="number"
                size="small"
                label="Size bar"
                value={bars.size}
                onChange={handleBarChange("size")}
                inputProps={{ min: 0 }}
              />

              <TextField
                fullWidth
                type="number"
                size="small"
                label="Weight"
                value={weights.size}
                onChange={handleWeightChange("size")}
                inputProps={{
                  min: 0,
                  max: 100,
                }}
              />
            </Box>

            <Box className="threshold-section">
              <Typography className="threshold-section-title">
                Tier Thresholds
              </Typography>

              <Typography className="threshold-section-description">
                Define the score thresholds used to classify stores.
              </Typography>

              <Box className="threshold-grid">
                <TextField
                  fullWidth
                  type="number"
                  size="small"
                  label="Large Tier Threshold (%)"
                  value={tierThresholds.large}
                  onChange={handleThresholdChange(
                    "large"
                  )}
                  inputProps={{
                    min: 0,
                    max: 100,
                  }}
                  helperText="Score required for Large"
                />

                <TextField
                  fullWidth
                  type="number"
                  size="small"
                  label="Medium Tier Threshold (%)"
                  value={tierThresholds.medium}
                  onChange={handleThresholdChange(
                    "medium"
                  )}
                  inputProps={{
                    min: 0,
                    max: 100,
                  }}
                  helperText="Score required for Medium"
                />
              </Box>

              {tierThresholds.large !== "" &&
                tierThresholds.medium !== "" &&
                Number(tierThresholds.large) <=
                  Number(tierThresholds.medium) && (
                  <Typography className="threshold-error">
                    Large tier threshold must be
                    greater than medium tier
                    threshold.
                  </Typography>
                )}
            </Box>

            <Box
              className={
                isWeightValid
                  ? "weight-summary valid"
                  : "weight-summary invalid"
              }
            >
              <Typography>
                Total weight
              </Typography>

              <Typography>
                {totalWeight}%
              </Typography>
            </Box>

            {error && (
              <Typography className="error-message">
                {error}
              </Typography>
            )}

            <Button
              variant="contained"
              className="submit-button"
              fullWidth
              startIcon={<SearchIcon />}
              disabled={
                !areClassificationInputsValid ||
                isLoadingStores
              }
              onClick={handleShowStores}
            >
              {isLoadingStores
                ? "Calculating..."
                : "Show Stores"}
            </Button>

            <Button
              variant="text"
              className="new-upload-button"
              onClick={handleNewUpload}
              disabled={isLoadingStores}
            >
              Upload New File
            </Button>
          </Stack>
        </Paper>
      </Container>
    </main>
  );
}

export default App;