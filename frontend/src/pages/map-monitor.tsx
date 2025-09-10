import type { Device } from 'src/types';

import React, { useState, useEffect, useCallback } from 'react';

import { apiService } from 'src/services/api';

import { useSnackbar } from 'src/components/snackbar/snackbar-context';

import MonitorPage from './MonitorPage';

// ----------------------------------------------------------------------

export default function MapMonitorPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getDevices();
      const devicesData = Array.isArray(response) ? [...response] : [];

      const transformedDevices = devicesData.map((device) => ({
        id: device.ID || device.id,
        name: device.name,
        topic: device.topic,
        user_id: device.user_id,
        longitude: device.longitude,
        latitude: device.latitude,
        address: device.address,
        status: device.status as 'online' | 'offline' | 'warning',
        last_seen: device.last_seen,
        created_at: device.CreatedAt || device.created_at,
        updated_at: device.UpdatedAt || device.updated_at,
      }));

      setDevices(transformedDevices);
    } catch (err) {
      console.error('Failed to fetch devices:', err);
      enqueueSnackbar('获取设备列表失败', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          width: '100%',
        }}
      >
        <div>地图加载中...</div>
      </div>
    );
  }

  return <MonitorPage devices={devices} />;
}
