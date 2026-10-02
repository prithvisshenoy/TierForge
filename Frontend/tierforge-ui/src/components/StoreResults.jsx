import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

function StoreResults({
  stores,
  selectedTier,
  onTierChange,
}) {
  const filteredStores =
    selectedTier === "ALL"
      ? stores
      : stores.filter(
          (store) =>
            store.tier?.toUpperCase() === selectedTier
        );

  return (
    <Paper elevation={0} className="dashboard-section">
      <Box className="store-results-header">
        <Box>
          <Typography variant="h5" className="section-title">
            Store Results
          </Typography>

          <Typography className="section-description">
            View the calculated score and tier for each
            enriched store.
          </Typography>
        </Box>

        <FormControl size="small" className="tier-filter">
          <InputLabel>Tier</InputLabel>

          <Select
            value={selectedTier}
            label="Tier"
            onChange={(event) =>
              onTierChange(event.target.value)
            }
          >
            <MenuItem value="ALL">All</MenuItem>
            <MenuItem value="LARGE">Large</MenuItem>
            <MenuItem value="MEDIUM">Medium</MenuItem>
            <MenuItem value="SMALL">Small</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {filteredStores.length === 0 ? (
        <Typography className="empty-message">
          No stores match the selected tier.
        </Typography>
      ) : (
        <Box className="table-wrapper">
          <Table className="dashboard-table">
            <TableHead>
              <TableRow>
                <TableCell>Store ID</TableCell>
                <TableCell>Store Name</TableCell>
                <TableCell>Footfall</TableCell>
                <TableCell>Revenue</TableCell>
                <TableCell>Size (sq ft)</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Tier</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredStores.map((store) => (
                <TableRow key={store.store_id}>
                  <TableCell>
                    {store.store_id}
                  </TableCell>

                  <TableCell>
                    {store.store_name || "-"}
                  </TableCell>

                  <TableCell>
                    {store.metrics?.footfall ?? "-"}
                  </TableCell>

                  <TableCell>
                    {store.metrics?.revenue ?? "-"}
                  </TableCell>

                  <TableCell>
                    {store.metrics?.size_sqft ?? "-"}
                  </TableCell>

                  <TableCell>
                    {store.score_percentage ?? 0}%
                  </TableCell>

                  <TableCell>
                    <span
                      className={`category-badge ${getTierClass(
                        store.tier
                      )}`}
                    >
                      {store.tier || "-"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Paper>
  );
}

function getTierClass(tier) {
  switch (tier?.toUpperCase()) {
    case "LARGE":
      return "tier-large";

    case "MEDIUM":
      return "tier-medium";

    case "SMALL":
      return "tier-small";

    default:
      return "";
  }
}

export default StoreResults;