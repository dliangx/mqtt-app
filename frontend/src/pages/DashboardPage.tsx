import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import useWebSocket, { ReadyState } from "react-use-websocket";
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  AppBar,
  Toolbar,
  Paper,
  Grid,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

interface Device {
  ID: number;
  name: string;
  topic: string;
}

const DashboardPage: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [newDeviceTopic, setNewDeviceTopic] = useState("");
  const navigate = useNavigate();

  // --- WebSocket Logic ---
  const [socketUrl, setSocketUrl] = useState<string | null>(null);
  const { lastMessage, readyState } = useWebSocket(socketUrl, {
    onOpen: () => console.log("WebSocket connection opened."),
    onClose: () => console.log("WebSocket connection closed."),
    shouldReconnect: () => true,
  });
  const [messageHistory, setMessageHistory] = useState<string[]>([]);

  useEffect(() => {
    if (lastMessage !== null) {
      setMessageHistory((prev) => [String(lastMessage.data), ...prev]);
    }
  }, [lastMessage]);

  const connectionStatus = {
    [ReadyState.CONNECTING]: "Connecting",
    [ReadyState.OPEN]: "Open",
    [ReadyState.CLOSING]: "Closing",
    [ReadyState.CLOSED]: "Closed",
    [ReadyState.UNINSTANTIATED]: "Uninstantiated",
  }[readyState];

  const handleConnect = () => {
    const token = localStorage.getItem("token");
    if (token) {
      const host = window.location.host;
      const wsUrl = `ws://${host}/api/ws?token=${token}`;
      setSocketUrl(wsUrl);
    } else {
      navigate("/login");
    }
  };

  const handleDisconnect = () => {
    setSocketUrl(null);
  };
  // --- End WebSocket Logic ---

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return {};
    }
    return { Authorization: `Bearer ${token}` };
  }, [navigate]);

  const fetchDevices = useCallback(async () => {
    try {
      const response = await axios.get("/api/devices", {
        headers: getAuthHeaders(),
      });
      setDevices(response.data || []);
    } catch (error) {
      console.error("Error fetching devices", error);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleAddDevice = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await axios.post(
        "/api/devices",
        { name: newDeviceName, topic: newDeviceTopic },
        { headers: getAuthHeaders() },
      );
      setNewDeviceName("");
      setNewDeviceTopic("");
      fetchDevices(); // Refresh list
    } catch (error) {
      // @ts-expect-error - Axios error response structure
      alert(error.response?.data?.error || "Error adding device");
    }
  };

  const handleDeleteDevice = async (id: number) => {
    try {
      await axios.delete(`/api/devices/${id}`, { headers: getAuthHeaders() });
      fetchDevices(); // Refresh list
    } catch (error) {
      console.error("Error deleting device", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            IoT Dashboard
          </Typography>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg">
        <Grid container spacing={3} sx={{ my: 2 }}>
          {/* Device Management */}
          {/* @ts-expect-error - Grid item type issue */}
          <Grid item xs={12} md={6}>
            <Typography variant="h4" component="h1" gutterBottom>
              我的设备
            </Typography>
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6">添加新设备</Typography>
              <Box
                component="form"
                onSubmit={handleAddDevice}
                sx={{ mt: 2, display: "flex", gap: 2, alignItems: "center" }}
              >
                <TextField
                  label="设备名称"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  required
                  size="small"
                />
                <TextField
                  label="设备 Topic"
                  value={newDeviceTopic}
                  onChange={(e) => setNewDeviceTopic(e.target.value)}
                  required
                  size="small"
                />
                <Button type="submit" variant="contained">
                  添加
                </Button>
              </Box>
            </Paper>
            <List>
              {devices.map((device) => (
                <ListItem
                  key={device.ID}
                  divider
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleDeleteDevice(device.ID)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={device.name}
                    secondary={`Topic: ${device.topic}`}
                  />
                </ListItem>
              ))}
            </List>
          </Grid>

          {/* Monitoring */}
          {/* @ts-expect-error - Grid item type issue */}
          <Grid item xs={12} md={6}>
            <Typography variant="h4" component="h1" gutterBottom>
              实时监控
            </Typography>
            <Paper sx={{ p: 2 }}>
              <Box
                sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}
              >
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleConnect}
                  disabled={readyState === ReadyState.OPEN}
                >
                  连接
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleDisconnect}
                  disabled={readyState !== ReadyState.OPEN}
                >
                  断开
                </Button>
                <Typography>状态: {connectionStatus}</Typography>
              </Box>
              <Box
                sx={{
                  height: 400,
                  overflowY: "auto",
                  border: "1px solid #ccc",
                  p: 1,
                  backgroundColor: "#f5f5f5",
                  fontFamily: "monospace",
                }}
              >
                {messageHistory.map((message, idx) => (
                  <div key={idx}>{message}</div>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </>
  );
};

export default DashboardPage;
