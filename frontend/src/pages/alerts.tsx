import type { Alert as AlertType } from 'src/types';

import React, { useState, useEffect, useCallback } from 'react';

import { Refresh as RefreshIcon } from '@mui/icons-material';
import { Box, Chip, Paper, Typography, IconButton, LinearProgress } from '@mui/material';

import { CONFIG } from 'src/config-global';
import { apiService } from 'src/services/api';

import { useSnackbar } from 'src/components/snackbar';

import AlertList from '../components/alerts/AlertList';

// ----------------------------------------------------------------------

export default function AlertsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await apiService.getAlerts();
      setAlerts(Array.isArray(response) ? [...response] : []);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      throw err;
    }
  }, []);

  const fetchUnreadAlerts = useCallback(async () => {
    try {
      const response = await apiService.getUnreadAlerts();
      setUnreadAlerts(response || 0);
    } catch (err) {
      console.error('Failed to fetch unread alerts:', err);
      throw err;
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([fetchAlerts(), fetchUnreadAlerts()]);
    } catch (err) {
      console.error('Failed to fetch alert data:', err);
      enqueueSnackbar('获取消息数据失败', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [fetchAlerts, fetchUnreadAlerts, enqueueSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAlertClick = (alert: AlertType) => {
    console.log('Alert clicked:', alert);
    // 可以在这里实现消息详情弹窗或标记为已读
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiService.markAllAlertsAsRead();
      enqueueSnackbar('所有消息已标记为已读', { variant: 'success' });
      fetchUnreadAlerts();
    } catch (err) {
      console.error('Failed to mark alerts as read:', err);
      enqueueSnackbar('标记消息为已读失败', { variant: 'error' });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <LinearProgress sx={{ width: '100%', maxWidth: 400 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <title>{`消息中心 - ${CONFIG.appName}`}</title>

      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="h4">消息中心</Typography>
            <Chip
              label={`${unreadAlerts} 未读消息`}
              color={unreadAlerts > 0 ? 'error' : 'default'}
              variant={unreadAlerts > 0 ? 'filled' : 'outlined'}
            />
          </Box>
          <Box display="flex" gap={1}>
            {unreadAlerts > 0 && (
              <Chip
                label="标记所有为已读"
                color="primary"
                variant="outlined"
                onClick={handleMarkAllAsRead}
                clickable
              />
            )}
            <IconButton onClick={fetchData} size="large">
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>

        <Paper sx={{ p: 2 }}>
          <AlertList alerts={alerts} onRefresh={fetchData} onAlertClick={handleAlertClick} />
        </Paper>
      </Box>
    </Box>
  );
}
