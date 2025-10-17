import type { Device } from 'src/types';
import type { GeofenceViolation } from 'src/utils/geofence';

import React, { useRef, useMemo, useState, useCallback } from 'react';

import { Box } from '@mui/material';

import AMapComponent from 'src/components/map/AMapComponent';

interface MonitorPageProps {
  devices: Device[];
}

const MonitorPage: React.FC<MonitorPageProps> = ({ devices: rawDevices }) => {
  // 使用 useMemo 来优化 devices 数组，避免不必要的重新渲染
  const devices = useMemo(() => rawDevices, [rawDevices]);
  const [, setAlertOpen] = useState(false);
  const [, setAlertMessage] = useState('');
  const mapRef = useRef<any>(null);

  const handleMarkerClick = (device: Device) => {
    // 设备信息对话框现在在地图组件内部处理
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

  return (
    <Box
      sx={{
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        height: '100vh',
        width: '100wh',
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
    </Box>
  );
};

export default MonitorPage;
