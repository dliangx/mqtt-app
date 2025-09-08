import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  LocationOn as LocationIcon,
  // Warning as WarningIcon,
  Notifications as NotificationsIcon,
  Add as AddIcon,
  PlayArrow as PlayArrowIcon,
} from "@mui/icons-material";

import AMapComponent from "../components/map/AMapComponent.jsx";

import { apiService } from "../services/api";
import type { Device, Alert as AlertType } from "../types";

import AlertList from "../components/alerts/AlertList";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const EnhancedDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState(0);
  const [devices, setDevices] = useState<Device[]>([]);
  const [, setAlerts] = useState<AlertType[]>([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [addDeviceDialog, setAddDeviceDialog] = useState(false);
  const [newDevice, setNewDevice] = useState({
    name: "",
    topic: "",
    longitude: 0,
    latitude: 0,
    address: "",
  });
  const [testData, setTestData] = useState<string>("");
  const setSelectedDevice = useState<Device | null>(null)[1];
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchDevices(), fetchAlerts(), fetchUnreadAlerts()]);
    } catch (err) {
      setError("获取数据失败");
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const response = await apiService.getDevices();
      const devicesData = Array.isArray(response) ? [...response] : [];

      // 转换后端数据格式为前端期望的格式
      const transformedDevices = devicesData.map((device) => {
        const transformedDevice = {
          id: device.ID || device.id,
          name: device.name,
          topic: device.topic,
          user_id: device.user_id,
          longitude: device.longitude,
          latitude: device.latitude,
          address: device.address,
          status: device.status as "online" | "offline" | "warning",
          last_seen: device.last_seen,
          created_at: device.CreatedAt || device.created_at,
          updated_at: device.UpdatedAt || device.updated_at,
        };

        console.log("Device transformation:", {
          original: {
            ID: device.ID,
            longitude: device.longitude,
            latitude: device.latitude,
          },
          transformed: {
            id: transformedDevice.id,
            longitude: transformedDevice.longitude,
            latitude: transformedDevice.latitude,
          },
          types: {
            originalLng: typeof device.longitude,
            originalLat: typeof device.latitude,
            transformedLng: typeof transformedDevice.longitude,
            transformedLat: typeof transformedDevice.latitude,
          },
          isValid:
            !isNaN(Number(device.longitude)) && !isNaN(Number(device.latitude)),
        });

        return transformedDevice;
      });

      console.log("Fetched devices:", transformedDevices);
      console.log(
        "Device coordinates:",
        transformedDevices.map((d) => ({
          name: d.name,
          longitude: d.longitude,
          latitude: d.latitude,
          type: typeof d.longitude + "/" + typeof d.latitude,
        })),
      );

      // 检查转换后的坐标数据
      const invalidDevices = transformedDevices.filter(
        (device) =>
          isNaN(Number(device.longitude)) ||
          isNaN(Number(device.latitude)) ||
          device.longitude == null ||
          device.latitude == null,
      );

      if (invalidDevices.length > 0) {
        console.error("Invalid coordinates found in devices:", invalidDevices);
      }

      setDevices(transformedDevices);
    } catch (err) {
      console.error("Failed to fetch devices:", err);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await apiService.getAlerts();
      setAlerts(Array.isArray(response) ? [...response] : []);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    }
  };

  const fetchUnreadAlerts = async () => {
    try {
      const response = await apiService.getUnreadAlerts();
      setUnreadAlerts(response || 0);
    } catch (err) {
      console.error("Failed to fetch unread alerts:", err);
    }
  };

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
      setSuccess("设备添加成功");
      fetchDevices();
    } catch (err) {
      setError("添加设备失败");
      console.error("Failed to add device:", err);
    }
  };

  const handleGenerateTestData = async () => {
    try {
      const response = await apiService.generateTestData();
      // API响应结构是 { data: { test_data: [...] }, message: "..." }
      const testDataArray =
        (response.data as { test_data?: unknown[] })?.test_data || [];
      const testDataString = JSON.stringify(testDataArray, null, 2);
      setTestData(testDataString);
      setSuccess("测试数据生成成功");
    } catch (err) {
      setError("生成测试数据失败");
      console.error("Failed to generate test data:", err);
    }
  };

  const handlePushTestData = async () => {
    try {
      if (!testData.trim()) {
        setError("请先生成测试数据");
        return;
      }

      let parsedData;
      try {
        parsedData = JSON.parse(testData);
      } catch (parseError) {
        setError("测试数据格式错误，请检查JSON格式");
        console.error("JSON parse error:", parseError);
        return;
      }
      await apiService.pushTestData(parsedData);
      setSuccess("测试数据推送成功");
      fetchDevices();
    } catch (err) {
      setError("推送测试数据失败");
      console.error("Failed to push test data:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleAlertClick = (alert: AlertType) => {
    console.log("Alert clicked:", alert);
    // You can implement alert details modal here
  };

  const handleMarkerClick = (device: Device) => {
    setSelectedDevice(device);
    // 可以在这里实现设备详情弹窗或跳转到设备详情页面
    console.log("Device marker clicked:", device);
  };

  if (loading) {
    return (
      <Container>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="80vh"
        >
          <Typography>加载中...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      {/* Header */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          py={2}
        >
          <Typography variant="h4" component="h1">
            智能设备监控平台
          </Typography>
          <Box display="flex" gap={2} alignItems="center">
            <Chip
              icon={<NotificationsIcon />}
              label={`${unreadAlerts} 未读报警`}
              color={unreadAlerts > 0 ? "error" : "default"}
              variant={unreadAlerts > 0 ? "filled" : "outlined"}
            />
            <Button variant="outlined" onClick={handleLogout}>
              退出登录
            </Button>
          </Box>
        </Box>

        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
        >
          <Tab label="地图监控" />
          <Tab label="设备管理" />
          <Tab label="报警中心" />
          <Tab label="数据测试" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={currentTab} index={0}>
        <Box display="flex" flexDirection={{ xs: "column", lg: "row" }} gap={3}>
          <Box flex={2}>
            <Paper sx={{ p: 2 }}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography variant="h6">设备位置监控</Typography>
                <IconButton onClick={fetchDevices} size="small">
                  <RefreshIcon />
                </IconButton>
              </Box>
              <AMapComponent
                devices={devices}
                onMarkerClick={handleMarkerClick}
                height="400px"
              />
            </Paper>
          </Box>
          <Box flex={1}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                设备状态概览
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                <Chip
                  label={`在线设备: ${devices.filter((d) => d.status === "online").length}`}
                  color="success"
                  variant="outlined"
                />
                <Chip
                  label={`离线设备: ${devices.filter((d) => d.status === "offline").length}`}
                  color="error"
                  variant="outlined"
                />
                <Chip
                  label={`警告设备: ${devices.filter((d) => d.status === "warning").length}`}
                  color="warning"
                  variant="outlined"
                />
                <Chip
                  label={`总设备数: ${devices.length}`}
                  color="primary"
                  variant="outlined"
                />
              </Box>
            </Paper>

            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                最新报警
              </Typography>
              <AlertList
                showUnreadOnly={true}
                maxItems={5}
                onAlertClick={handleAlertClick}
              />
            </Paper>
          </Box>
        </Box>
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        <Paper sx={{ p: 2 }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={3}
          >
            <Typography variant="h6">设备列表</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddDeviceDialog(true)}
            >
              添加设备
            </Button>
          </Box>

          <Box display="flex" flexWrap="wrap" gap={2}>
            {devices.map((device) => (
              <Card key={device.id} sx={{ minWidth: 300, flex: 1 }}>
                <CardContent>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="start"
                    mb={2}
                  >
                    <Typography variant="h6">{device.name}</Typography>
                    <Chip
                      label={device.status === "online" ? "在线" : "离线"}
                      color={device.status === "online" ? "success" : "default"}
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
                        {device.longitude.toFixed(6)},{" "}
                        {device.latitude.toFixed(6)}
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
            ))}
          </Box>
        </Paper>
      </TabPanel>

      <TabPanel value={currentTab} index={2}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            报警信息
          </Typography>
          <AlertList onAlertClick={handleAlertClick} />
        </Paper>
      </TabPanel>

      <TabPanel value={currentTab} index={3}>
        <Box display="flex" flexDirection={{ xs: "column", md: "row" }} gap={3}>
          <Box flex={1}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                数据测试工具
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Button
                  variant="contained"
                  startIcon={<PlayArrowIcon />}
                  onClick={handleGenerateTestData}
                >
                  生成测试数据
                </Button>
                <Button
                  variant="contained"
                  startIcon={<PlayArrowIcon />}
                  onClick={handlePushTestData}
                  color="secondary"
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
              />
            </Paper>
          </Box>
        </Box>
      </TabPanel>

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
            />
            <TextField
              label="设备 Topic"
              value={newDevice.topic}
              onChange={(e) =>
                setNewDevice({ ...newDevice, topic: e.target.value })
              }
              required
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
            />
            <TextField
              label="地址"
              value={newDevice.address}
              onChange={(e) =>
                setNewDevice({ ...newDevice, address: e.target.value })
              }
              multiline
              rows={2}
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

      {/* Notifications */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError("")}
      >
        <Alert severity="error" onClose={() => setError("")}>
          {error}
        </Alert>
      </Snackbar>
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess("")}
      >
        <Alert severity="success" onClose={() => setSuccess("")}>
          {success}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default EnhancedDashboard;
