import { useState } from "react";
import Papa from "papaparse";

import { REQUIRED_CSV_HEADERS } from "./constants";
import { getJobStatus, getTiers, uploadFile } from "../api/apiService";

import UploadScreen from "./components/UploadScreen";
import JobOverview from "./components/JobOverview";
import FailedRecords from "./components/FailedRecords";
import TierBreakdown from "./components/TierBreakdown";
import ClassificationConfig from "./components/ClassificationConfig";
import StoreResults from "./components/StoreResults";

import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

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

  const [tierThresholds, setTierThresholds] = useState({
    large: "",
    medium: "",
  });

  const [stores, setStores] = useState([]);
  const [storeCounts, setStoreCounts] = useState({
    large: 0,
    medium: 0,
    small: 0,
  });

  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [selectedTier, setSelectedTier] = useState("ALL");

  const validateCsv = (selectedFile) => {
    return new Promise((resolve, reject) => {
      Papa.parse(selectedFile, {
        preview: 1,
        header: true,
        skipEmptyLines: true,

        complete: (results) => {
          const headers = results.meta.fields || [];

          const normalizedHeaders = headers.map((header) =>
            header.trim().toLowerCase()
          );

          const requiredHeaders = REQUIRED_CSV_HEADERS.map((header) =>
            header.trim().toLowerCase()
          );

          const hasValidHeaders =
            normalizedHeaders.length === requiredHeaders.length &&
            requiredHeaders.every((header) =>
              normalizedHeaders.includes(header)
            );

          if (!hasValidHeaders) {
            reject(
              new Error(
                `Invalid CSV headers. Required headers: ${REQUIRED_CSV_HEADERS.join(
                  ", "
                )}`
              )
            );
            return;
          }

          resolve();
        },

        error: (parseError) => {
          reject(parseError);
        },
      });
    });
  };

  const pollJobStatus = async (id) => {
    try {
      const data = await getJobStatus(id);

      setProgress(data);

      const percentage = data.progress?.percentage ?? 0;

      const isCompleted =
        data.status === "COMPLETED" || percentage >= 100;

      const isFailed =
        data.status === "FAILED" || data.status === "ERROR";

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
      }, 1000);
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.detail ||
          "Unable to fetch job status.Please try again later"
      );

      setIsUploading(false);
    }
  };

  const handleFileChange = async (selectedFile) => {
    setError("");

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setFile(null);
      setError("Please select a CSV file.");
      return;
    }

    try {
      await validateCsv(selectedFile);
      setFile(selectedFile);
    } catch (validationError) {
      setFile(null);
      setError(validationError.message);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    try {
      setError("");
      setIsUploading(true);
      setProgress(null);

      const response = await uploadFile(file);

      const id = response.job_id;

      setJobId(id);

      await pollJobStatus(id);
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.detail ||
          "Unable to upload file. Please try again later"
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

  const handleGetTiers = async () => {
    if (!areClassificationInputsValid) {
      return;
    }

    try {
      setError("");
      setIsLoadingStores(true);

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

  const handleReset = () => {
    setFile(null);
    setError("");

    setJobId(null);
    setProgress(null);
    setIsUploading(false);

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
  };

  const processingComplete =
    progress?.status === "COMPLETED" ||
    (progress?.progress?.percentage ?? 0) >= 100;

  if (!processingComplete) {
    return (
      <UploadScreen
        file={file}
        error={error}
        progress={progress}
        isUploading={isUploading}
        onFileChange={handleFileChange}
        onUpload={handleUpload}
      />
    );
  }

  return (
    <main className="dashboard-page">
      <JobOverview
        jobId={jobId}
        fileName={file?.name}
        progress={progress}
        onNewUpload={handleReset}
      />

      <FailedRecords progress={progress} />

      <TierBreakdown counts={storeCounts} />

      <ClassificationConfig
        bars={bars}
        weights={weights}
        tierThresholds={tierThresholds}
        totalWeight={totalWeight}
        isWeightValid={isWeightValid}
        areThresholdsValid={areThresholdsValid}
        isValid={areClassificationInputsValid}
        isLoading={isLoadingStores}
        error={error}
        onBarChange={handleBarChange}
        onWeightChange={handleWeightChange}
        onThresholdChange={handleThresholdChange}
        onRecalculate={handleGetTiers}
      />

      <StoreResults
        stores={stores}
        selectedTier={selectedTier}
        onTierChange={setSelectedTier}
      />
    </main>
  );
}

export default App;