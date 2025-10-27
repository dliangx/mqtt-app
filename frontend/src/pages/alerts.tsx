import type { Alert as AlertType } from 'src/types';

import React, { useState, useEffect, useCallback } from 'react';

import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import {
  Box,
  Chip,
  Paper,
  Button,
  Dialog,
  Typography,
  IconButton,
  DialogTitle,
  DialogActions,
  DialogContent,
  LinearProgress,
} from '@mui/material';

import { useRouter } from 'src/routes/hooks';

import { CONFIG } from 'src/config-global';
import { apiService } from 'src/services/api';

import { useSnackbar } from 'src/components/snackbar';

import AlertList from '../components/alerts/AlertList';

// ----------------------------------------------------------------------

export default function AlertsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<AlertType | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

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
    setSelectedAlert(alert);
    setShowDetailModal(true);

    // 如果消息未读，自动标记为已读
    if (!alert.read) {
      handleMarkAsRead(alert.ID);
    }
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedAlert(null);
  };

  const handleMarkAsRead = async (alertId: number) => {
    try {
      await apiService.markAlertAsRead(alertId);
      // 更新本地状态
      setAlerts((prevAlerts) =>
        prevAlerts.map((alert) => (alert.ID === alertId ? { ...alert, read: true } : alert))
      );
      fetchUnreadAlerts();
      enqueueSnackbar('消息已标记为已读', { variant: 'success' });
    } catch (err) {
      console.error('Failed to mark alert as read:', err);
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
            <IconButton onClick={fetchData} size="large">
              <RefreshIcon />
            </IconButton>
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={() => router.push('/message-types')}
              size="small"
            >
              消息类型配置
            </Button>
          </Box>
        </Box>

        <Paper sx={{ p: 2 }}>
          <AlertList alerts={alerts} onRefresh={fetchData} onAlertClick={handleAlertClick} />
        </Paper>
      </Box>

      {/* Alert详情模态框 */}
      <Dialog open={showDetailModal} onClose={handleCloseDetailModal} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">消息详情</Typography>
            <IconButton onClick={handleCloseDetailModal}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: '1 1 200px' }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      设备ID
                    </Typography>
                    <Typography variant="body1">{selectedAlert.device_id}</Typography>
                  </Box>
                  <Box sx={{ flex: '1 1 200px' }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      消息类型
                    </Typography>
                    <Typography variant="body1">{selectedAlert.type}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: '1 1 200px' }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      优先级
                    </Typography>
                    <Chip
                      label={selectedAlert.level}
                      color={
                        selectedAlert.level === 'critical'
                          ? 'error'
                          : selectedAlert.level === 'high'
                            ? 'warning'
                            : selectedAlert.level === 'medium'
                              ? 'info'
                              : 'default'
                      }
                      size="small"
                    />
                  </Box>
                  <Box sx={{ flex: '1 1 200px' }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      状态
                    </Typography>
                    <Chip
                      label={selectedAlert.read ? '已读' : '未读'}
                      color={selectedAlert.read ? 'default' : 'primary'}
                      variant={selectedAlert.read ? 'outlined' : 'filled'}
                      size="small"
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    消息内容
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 1 }}>
                    {selectedAlert.message}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    时间戳
                  </Typography>
                  <Typography variant="body1">
                    {new Date(selectedAlert.timestamp * 1000).toLocaleString('zh-CN')}
                  </Typography>
                </Box>
                {selectedAlert.raw_data && (
                  <Box>
                    <Typography variant="subtitle2">原始数据</Typography>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        mt: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        wordBreak: 'break-all',
                      }}
                    >
                      {selectedAlert.raw_data}
                    </Paper>
                  </Box>
                )}
                {selectedAlert.parsed_data && (
                  <Box>
                    <Typography variant="subtitle2">解析数据</Typography>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        mt: 1,
                        maxHeight: 200,
                        overflow: 'auto',
                      }}
                    >
                      {(() => {
                        try {
                          const parsed = JSON.parse(selectedAlert.parsed_data);
                          return JSON.stringify(parsed, null, 2);
                        } catch {
                          return selectedAlert.parsed_data;
                        }
                      })()}
                    </Paper>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetailModal}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
