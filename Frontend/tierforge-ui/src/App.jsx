import { useState } from "react";
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import { REQUIRED_CSV_HEADERS } from "./constants";
import Papa from "papaparse";

import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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

  const handleSubmit = () => {
    if (!file) return;

    console.log("Submitting:", file);
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

            <Button
              variant="contained"
              className="submit-button"
              fullWidth
              disabled={!file || error}
              onClick={handleSubmit}
            >
              Submit
            </Button>
          </Stack>
        </Paper>
      </Container>
    </main>
  );
}

export default App;