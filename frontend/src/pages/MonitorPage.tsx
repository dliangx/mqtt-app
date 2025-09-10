import type { Device } from 'src/types';
import type { GeofenceViolation } from 'src/utils/geofence';

import React, { useMemo, useState, useCallback, useRef } from 'react';

import {
  Box,
  Chip,
  Button,
  Dialog,
  Typography,
  DialogTitle,
  DialogActions,
  DialogContent,
} from '@mui/material';

import AMapComponent from 'src/components/map/AMapComponent';

interface MonitorPageProps {
  devices: Device[];
}

const MonitorPage: React.FC<MonitorPageProps> = ({ devices: rawDevices }) => {
  // 使用 useMemo 来优化 devices 数组，避免不必要的重新渲染
  const devicesJson = JSON.stringify(rawDevices);
  const devices = useMemo(() => rawDevices, [devicesJson]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, setAlertOpen] = useState(false);
  const [, setAlertMessage] = useState('');
  const mapRef = useRef<any>(null);

  const handleMarkerClick = (device: Device) => {
    setSelectedDevice(device);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedDevice(null);
  };

  const handleGeofenceViolation = useCallback((violation: GeofenceViolation) => {
    setAlertMessage(violation.message);
    setAlertOpen(true);

    // 警报显示5秒后自动关闭
    setTimeout(() => {
      setAlertOpen(false);
    }, 5000);
  }, []);

  // const handleCloseAlert = () => {
  //   setAlertOpen(false);
  // };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'success';
      case 'offline':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
        return '在线';
      case 'offline':
        return '离线';
      case 'warning':
        return '警告';
      default:
        return status;
    }
  };

  return (
    <Box
      sx={{
        height: '100vh',
        width: '100vw',
        top: 0,
        left: 0,
        p: 0,
        m: 0,
      }}
    >
      {/* Map component with geofence and navigation features */}
      <AMapComponent
        ref={mapRef}
        devices={devices}
        onMarkerClick={handleMarkerClick}
        onGeofenceViolation={handleGeofenceViolation}
        height="100%"
      />

      {/* Device Info Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>设备信息 - {selectedDevice?.name || '未知设备'}</DialogTitle>
        <DialogContent>
          {selectedDevice && (
            <Box sx={{ mt: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
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
                {selectedDevice.topic || '未设置'}
              </Typography>

              {selectedDevice.longitude && selectedDevice.latitude && (
                <>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    位置坐标
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {Number(selectedDevice.longitude).toFixed(6)},{' '}
                    {Number(selectedDevice.latitude).toFixed(6)}
                  </Typography>
                </>
              )}

              {selectedDevice.address && (
                <>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    地址
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedDevice.address}
                  </Typography>
                </>
              )}

              <Box mt={2}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    if (selectedDevice.longitude && selectedDevice.latitude && mapRef.current) {
                      mapRef.current.navigateToDevice(selectedDevice);
                      handleCloseDialog();
                    }
                  }}
                  disabled={!selectedDevice.longitude || !selectedDevice.latitude}
                >
                  导航到此位置
                </Button>
              </Box>
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
