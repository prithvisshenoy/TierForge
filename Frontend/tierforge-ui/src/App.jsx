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

import "./App.css";

function App() {
  const [file, setFile] = useState(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      setFile(selectedFile);
    }
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
              disabled={!file}
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