import React, { useState } from 'react';

import {
  PlayArrow as PlayArrowIcon,
  Route as RouteIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { Box, Paper, Button, TextField, Typography, LinearProgress } from '@mui/material';

import { CONFIG } from 'src/config-global';
import { apiService } from 'src/services/api';

import { useSnackbar } from 'src/components/snackbar';

// ----------------------------------------------------------------------

export default function TestDataPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [testData, setTestData] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleGenerateTestData = async () => {
    try {
      setLoading(true);
      const response = await apiService.generateTestData();
      // API响应结构是 { data: { test_data: [...] }, message: "..." }
      const testDataArray = (response.data as { test_data?: unknown[] })?.test_data || [];
      const testDataString = JSON.stringify(testDataArray, null, 2);
      setTestData(testDataString);
      enqueueSnackbar('测试数据生成成功', { variant: 'success' });
    } catch (err) {
      console.error('Failed to generate test data:', err);
      enqueueSnackbar('生成测试数据失败', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePushTestData = async () => {
    try {
      if (!testData.trim()) {
        enqueueSnackbar('请先生成测试数据', { variant: 'warning' });
        return;
      }

      let parsedData;
      try {
        parsedData = JSON.parse(testData);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        enqueueSnackbar('测试数据格式错误，请检查JSON格式', { variant: 'error' });
        return;
      }

      setLoading(true);
      await apiService.pushTestData(parsedData);
      enqueueSnackbar('测试数据推送成功', { variant: 'success' });
    } catch (err) {
      console.error('Failed to push test data:', err);
      enqueueSnackbar('推送测试数据失败', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateTrajectoryData = async () => {
    try {
      setLoading(true);
      const response = await apiService.generateTrajectoryData();
      const trajectoryData = response.data;
      const trajectoryDataString = JSON.stringify(trajectoryData, null, 2);
      setTestData(trajectoryDataString);
      enqueueSnackbar('轨迹追踪数据生成成功', { variant: 'success' });
    } catch (err) {
      console.error('Failed to generate trajectory data:', err);
      enqueueSnackbar('生成轨迹追踪数据失败', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePushTrajectoryAlerts = async () => {
    try {
      if (!testData.trim()) {
        enqueueSnackbar('请先生成轨迹追踪数据', { variant: 'warning' });
        return;
      }

      let parsedData;
      try {
        parsedData = JSON.parse(testData);
        console.log('Parsed trajectory data:', parsedData);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        enqueueSnackbar('轨迹数据格式错误，请检查JSON格式', { variant: 'error' });
        return;
      }

      // 获取设备列表
      console.log('Fetching devices...');
      const devicesResponse = await apiService.getDevices();
      const devices = Array.isArray(devicesResponse) ? [...devicesResponse] : [];
      console.log('Available devices:', devices);

      if (devices.length === 0) {
        enqueueSnackbar('没有可用的设备，请先创建设备', { variant: 'warning' });
        return;
      }

      setLoading(true);

      // 将轨迹数据转换为Alert格式并推送
      let successCount = 0;
      let errorCount = 0;
      console.log(parsedData);
      for (let i = 0; i < parsedData.data.length; i++) {
        try {
          const device = devices[0];

          // 创建Alert数据
          const alertData = {
            device_id: device.ID,
            type: '1', //对应message-type-config的id
            message: '轨迹点',
            raw_data: parsedData.data[i],
            level: 'medium',
            read: true,
          };
          console.log(`Creating alert ${i + 1}:`, alertData);

          await apiService.createAlert(alertData);
          console.log(`Successfully created alert ${i + 1}`);
          successCount++;
        } catch (err) {
          console.error(`Failed to push alert ${i + 1}:`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        enqueueSnackbar(
          `成功推送 ${successCount} 条轨迹告警数据${errorCount > 0 ? `，失败 ${errorCount} 条` : ''}`,
          {
            variant: successCount === parsedData.length ? 'success' : 'warning',
          }
        );
      } else {
        enqueueSnackbar('推送轨迹告警数据失败', { variant: 'error' });
      }
    } catch (err) {
      console.error('Failed to push trajectory alerts:', err);
      enqueueSnackbar('推送轨迹告警数据失败', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <title>{`数据测试 - ${CONFIG.appName}`}</title>

      <Box>
        <Typography variant="h4" gutterBottom>
          数据测试工具
        </Typography>

        <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={3}>
          <Box flex={1}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                测试操作
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Button
                  variant="contained"
                  startIcon={<PlayArrowIcon />}
                  onClick={handleGenerateTestData}
                  disabled={loading}
                >
                  生成测试数据
                </Button>
                <Button
                  variant="contained"
                  startIcon={<RouteIcon />}
                  onClick={handleGenerateTrajectoryData}
                  disabled={loading}
                  color="success"
                >
                  生成轨迹追踪数据
                </Button>
                <Button
                  variant="contained"
                  startIcon={<PlayArrowIcon />}
                  onClick={handlePushTestData}
                  color="secondary"
                  disabled={loading || !testData.trim()}
                >
                  推送测试数据
                </Button>
                <Button
                  variant="contained"
                  startIcon={<WarningIcon />}
                  onClick={handlePushTrajectoryAlerts}
                  color="warning"
                  disabled={loading || !testData.trim()}
                >
                  推送轨迹告警数据
                </Button>
                <Typography variant="body2" color="textSecondary">
                  生成模拟的设备位置数据和传感器数据，用于测试地图显示和监控功能。
                </Typography>
              </Box>
            </Paper>
          </Box>

          <Box flex={1}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                测试数据编辑
              </Typography>
              <TextField
                label="测试数据"
                value={testData}
                onChange={(e) => setTestData(e.target.value)}
                multiline
                rows={12}
                fullWidth
                variant="outlined"
                placeholder="点击'生成测试数据'按钮生成数据，然后可以编辑或直接推送"
                disabled={loading}
              />
            </Paper>
          </Box>
        </Box>

        {loading && (
          <Box sx={{ width: '100%', mt: 2 }}>
            <LinearProgress />
          </Box>
        )}
      </Box>
    </Box>
  );
}
