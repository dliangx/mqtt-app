import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Container, Box, Typography, Snackbar, Alert } from "@mui/material";

import AppBottomNavigation from "./components/BottomNavigation";
import MonitorPage from "./pages/MonitorPage";
import ManagementPage from "./pages/ManagementPage";
import MessagesPage from "./pages/MessagesPage";
import ProfilePage from "./pages/ProfilePage";
import LoginPage from "./pages/LoginPage";
import { apiService } from "./services/api";
import type { Device, Alert as AlertType } from "./types";

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const isAuthenticated = !!localStorage.getItem("token");
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  const [currentTab, setCurrentTab] = useState(0);
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("token"),
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);

    if (token) {
      fetchData();
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
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
      setDevices(devicesData);
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

  const handleRefresh = () => {
    fetchData();
  };

  const handleMarkAsRead = async (alertId: number) => {
    try {
      await apiService.markAlertAsRead(alertId);
      setSuccess("标记为已读成功");
      fetchAlerts();
      fetchUnreadAlerts();
    } catch (err) {
      setError("标记为已读失败");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    setDevices([]);
    setAlerts([]);
    setUnreadAlerts(0);
  };

  const renderCurrentTab = () => {
    switch (currentTab) {
      case 0: // 监控
        return (
          <MonitorPage
            devices={devices}
            loading={loading}
            onRefresh={handleRefresh}
          />
        );
      case 1: // 管理
        return (
          <ManagementPage
            devices={devices}
            loading={loading}
            onRefresh={handleRefresh}
          />
        );
      case 2: // 消息
        return (
          <MessagesPage
            alerts={alerts}
            unreadCount={unreadAlerts}
            loading={loading}
            onMarkAsRead={handleMarkAsRead}
            onRefresh={handleRefresh}
          />
        );
      case 3: // 我的
        return (
          <ProfilePage onRefresh={handleRefresh} onLogout={handleLogout} />
        );
      default:
        return <MonitorPage devices={devices} loading={loading} />;
    }
  };

  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    );
  }

  if (loading && devices.length === 0) {
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
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Navigate to="/" />} />
        <Route
          path="/"
          element={
            <Box sx={{ pb: 7 }}>
              <Container maxWidth="sm" sx={{ p: 0 }}>
                {renderCurrentTab()}
              </Container>

              <AppBottomNavigation
                currentTab={currentTab}
                onTabChange={setCurrentTab}
                unreadAlerts={unreadAlerts}
              />

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
            </Box>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
