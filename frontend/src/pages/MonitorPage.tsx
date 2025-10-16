import type { Device } from 'src/types';
import type { GeofenceViolation } from 'src/utils/geofence';

import React, { useMemo, useCallback, useRef, useState } from 'react';

import { Box } from '@mui/material';

import AMapComponent from 'src/components/map/AMapComponent';

interface MonitorPageProps {
  devices: Device[];
}

const MonitorPage: React.FC<MonitorPageProps> = ({ devices: rawDevices }) => {
  // 使用 useMemo 来优化 devices 数组，避免不必要的重新渲染
  const devicesJson = JSON.stringify(rawDevices);
  const devices = useMemo(() => rawDevices, [devicesJson]);
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
        height: 'calc(100vh - 72px)',
        width: 'calc(100vw - 240px)',
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
