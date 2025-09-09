import React from "react";
import { Box, Paper, Typography, Chip, IconButton } from "@mui/material";
import { Refresh as RefreshIcon } from "@mui/icons-material";
import AMapComponent from "../components/map/AMapComponent";
import type { Device } from "../types";

interface MonitorPageProps {
  devices: Device[];
  loading: boolean;
  onRefresh: () => void;
}

const MonitorPage: React.FC<MonitorPageProps> = ({
  devices,
  loading,
  onRefresh,
}) => {
  const onlineDevices = devices.filter((d) => d.status === "online").length;
  const offlineDevices = devices.filter((d) => d.status === "offline").length;
  const warningDevices = devices.filter((d) => d.status === "warning").length;

  const handleMarkerClick = (device: Device) => {
    console.log("Device marker clicked:", device);
  };

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        p: 0,
        m: 0,
      }}
    >
      {/* Map component that fills the remaining space */}
      <Box
        sx={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <AMapComponent
          devices={devices}
          onMarkerClick={handleMarkerClick}
          height="100%"
        />
      </Box>
    </Box>
  );
};

export default MonitorPage;
