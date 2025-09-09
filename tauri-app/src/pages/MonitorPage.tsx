import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import AMapComponent from "../components/map/AMapComponent";
import type { Device } from "../types";

interface MonitorPageProps {
  devices: Device[];
}

const MonitorPage: React.FC<MonitorPageProps> = ({ devices: rawDevices }) => {
  // 使用 useMemo 来优化 devices 数组，避免不必要的重新渲染
  const devices = useMemo(() => rawDevices, [JSON.stringify(rawDevices)]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleMarkerClick = (device: Device) => {
    setSelectedDevice(device);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedDevice(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "success";
      case "offline":
        return "error";
      case "warning":
        return "warning";
      default:
        return "default";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "online":
        return "在线";
      case "offline":
        return "离线";
      case "warning":
        return "警告";
      default:
        return status;
    }
  };

  return (
    <Box
      sx={{
        height: "100vh",
        width: "100vw",
        position: "fixed",
        top: 0,
        left: 0,
        p: 0,
        m: 0,
      }}
    >
      {/* Map component */}
      <AMapComponent
        devices={devices}
        onMarkerClick={handleMarkerClick}
        height="100%"
      />

      {/* Device Info Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          设备信息 - {selectedDevice?.name || "未知设备"}
        </DialogTitle>
        <DialogContent>
          {selectedDevice && (
            <Box sx={{ mt: 2 }}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography variant="h6">{selectedDevice.name}</Typography>
                <Chip
                  label={getStatusText(selectedDevice.status)}
                  color={getStatusColor(selectedDevice.status)}
                  size="small"
                />
              </Box>

              <Typography variant="body2" color="textSecondary" gutterBottom>
                Topic
              </Typography>
              <Typography variant="body1" gutterBottom>
                {selectedDevice.topic || "未设置"}
              </Typography>

              {selectedDevice.longitude && selectedDevice.latitude && (
                <>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    gutterBottom
                  >
                    位置坐标
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {Number(selectedDevice.longitude).toFixed(6)},{" "}
                    {Number(selectedDevice.latitude).toFixed(6)}
                  </Typography>
                </>
              )}

              {selectedDevice.address && (
                <>
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    gutterBottom
                  >
                    地址
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedDevice.address}
                  </Typography>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MonitorPage;
