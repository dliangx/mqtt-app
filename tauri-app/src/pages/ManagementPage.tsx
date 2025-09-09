import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  AppBar,
  Toolbar,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  LocationOn as LocationIcon,
} from "@mui/icons-material";
import type { Device } from "../types";
import { apiService } from "../services/api";

interface ManagementPageProps {
  devices: Device[];
  loading: boolean;
  onRefresh: () => void;
}

const ManagementPage: React.FC<ManagementPageProps> = ({
  devices,
  loading,
  onRefresh,
}) => {
  const [addDeviceDialog, setAddDeviceDialog] = useState(false);
  const [newDevice, setNewDevice] = useState({
    name: "",
    topic: "",
    longitude: 0,
    latitude: 0,
    address: "",
  });

  const handleAddDevice = async () => {
    try {
      await apiService.createDevice(newDevice);
      setAddDeviceDialog(false);
      setNewDevice({
        name: "",
        topic: "",
        longitude: 0,
        latitude: 0,
        address: "",
      });
      onRefresh();
    } catch (err) {
      console.error("Failed to add device:", err);
    }
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
    <div>
      {/* Header */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          backgroundColor: "rgba(245, 245, 245, 0.95)",
          color: "black",
          borderRadius: 0,
        }}
      >
        <Toolbar sx={{ justifyContent: "center" }}>
          <Typography>设备管理</Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 2, mt: 8 }}>
        <Box display="flex" gap={1}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDeviceDialog(true)}
            size="small"
          >
            添加设备
          </Button>
        </Box>
        <Divider sx={{ my: 1 }} />
        {/* Device List */}
        <Grid container spacing={2}>
          {devices.map((device) => (
            <Grid
              item
              size={{
                xs: 6,
              }}
              key={device.id}
            >
              <Card variant="outlined" sx={{ width: "100%" }}>
                <CardContent>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="start"
                    mb={1}
                  >
                    <Typography variant="subtitle1" component="h3">
                      {device.name}
                    </Typography>
                    <Chip
                      label={getStatusText(device.status)}
                      color={getStatusColor(device.status)}
                      size="small"
                    />
                  </Box>

                  <Typography
                    variant="body2"
                    color="textSecondary"
                    gutterBottom
                  >
                    Topic: {device.topic}
                  </Typography>

                  {device.longitude && device.latitude && (
                    <Box display="flex" alignItems="center" mt={1}>
                      <LocationIcon fontSize="small" color="action" />
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        sx={{ ml: 0.5 }}
                      >
                        {Number(device.longitude).toFixed(6)},{" "}
                        {Number(device.latitude).toFixed(6)}
                      </Typography>
                    </Box>
                  )}

                  {device.address && (
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      sx={{ mt: 1 }}
                    >
                      {device.address}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {devices.length === 0 && !loading && (
          <Paper sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="body2" color="textSecondary">
              暂无设备，请添加设备
            </Typography>
          </Paper>
        )}

        {/* Add Device Dialog */}
        <Dialog
          open={addDeviceDialog}
          onClose={() => setAddDeviceDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>添加新设备</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <TextField
                label="设备名称"
                value={newDevice.name}
                onChange={(e) =>
                  setNewDevice({ ...newDevice, name: e.target.value })
                }
                required
                size="small"
              />
              <TextField
                label="设备 Topic"
                value={newDevice.topic}
                onChange={(e) =>
                  setNewDevice({ ...newDevice, topic: e.target.value })
                }
                required
                size="small"
              />
              <TextField
                label="经度"
                type="number"
                value={newDevice.longitude}
                onChange={(e) =>
                  setNewDevice({
                    ...newDevice,
                    longitude: parseFloat(e.target.value) || 0,
                  })
                }
                size="small"
              />
              <TextField
                label="纬度"
                type="number"
                value={newDevice.latitude}
                onChange={(e) =>
                  setNewDevice({
                    ...newDevice,
                    latitude: parseFloat(e.target.value) || 0,
                  })
                }
                size="small"
              />
              <TextField
                label="地址"
                value={newDevice.address}
                onChange={(e) =>
                  setNewDevice({ ...newDevice, address: e.target.value })
                }
                multiline
                rows={2}
                size="small"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddDeviceDialog(false)}>取消</Button>
            <Button
              onClick={handleAddDevice}
              variant="contained"
              disabled={!newDevice.name || !newDevice.topic}
            >
              添加
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </div>
  );
};

export default ManagementPage;
