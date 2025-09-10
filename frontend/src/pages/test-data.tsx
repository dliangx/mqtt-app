import React, { useState } from 'react';

import { PlayArrow as PlayArrowIcon } from '@mui/icons-material';
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

  return (
    <>
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
                  startIcon={<PlayArrowIcon />}
                  onClick={handlePushTestData}
                  color="secondary"
                  disabled={loading || !testData.trim()}
                >
                  推送测试数据
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
    </>
  );
}
