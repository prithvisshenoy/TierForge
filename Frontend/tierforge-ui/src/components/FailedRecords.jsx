import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

function FailedRecords({ progress }) {
  const failedCount =
    progress?.progress?.failed_records ?? 0;

  const failedRecords =
    progress?.progress?.failed_records_details || []

  if (failedCount === 0) {
    return null;
  }

  return (
    <Paper elevation={0} className="dashboard-section">
      <Typography variant="h5" className="section-title">
        Failed Records
      </Typography>

      <Typography className="section-description">
        Records that could not be enriched during processing.
      </Typography>

      {failedRecords.length > 0 ? (
        <Box className="table-wrapper">
          <Table className="dashboard-table">
            <TableHead>
              <TableRow>
                <TableCell>Store ID</TableCell>
                <TableCell>Store Name</TableCell>
                <TableCell>Failure Reason</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {failedRecords.map((record, index) => (
                <TableRow key={record.store_id || index}>
                  <TableCell>
                    {record.store_id || record.id || "-"}
                  </TableCell>

                  <TableCell>
                    {record.store_name || record.name || "-"}
                  </TableCell>

                  <TableCell>
                    {record.reason ||
                      record.failure_reason ||
                      record.error ||
                      record.message ||
                      "Unknown failure"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      ) : (
        <Typography className="empty-message">
          {failedCount} record(s) failed, but failure details
          were not returned by the backend.
        </Typography>
      )}
    </Paper>
  );
}

export default FailedRecords;