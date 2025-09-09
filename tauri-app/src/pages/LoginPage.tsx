import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
} from "@mui/material";
import { apiService } from "../services/api";

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
    setError("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (tab === 0) {
        // Login
        const response = await apiService.login({ username, password });
        const { token } = response.data;

        // 只要有token就认为登录成功
        localStorage.setItem("token", token);
        const userInfo = { username, email: username + "@example.com" };
        localStorage.setItem("user", JSON.stringify(userInfo));
        navigate("/");
      } else {
        // Register
        await apiService.register({ username, email, password });
        setError("注册成功！请登录");
        setTab(0);
        setUsername("");
        setPassword("");
        setEmail("");
      }
    } catch (error: any) {
      setError(error.response?.data?.error || "操作失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Typography component="h1" variant="h5" gutterBottom>
          MQTT 监控平台
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: "divider", width: "100%" }}>
          <Tabs value={tab} onChange={handleTabChange} centered>
            <Tab label="登录" />
            <Tab label="注册" />
          </Tabs>
        </Box>

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ mt: 2, width: "100%" }}
        >
          {error && (
            <Alert
              severity={
                tab === 1 && error.includes("成功") ? "success" : "error"
              }
              sx={{ mb: 2 }}
            >
              {error}
            </Alert>
          )}

          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="用户名"
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
          />

          {tab === 1 && (
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="邮箱"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          )}

          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="密码"
            type="password"
            id="password"
            autoComplete={tab === 0 ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : tab === 0 ? (
              "登录"
            ) : (
              "注册"
            )}
          </Button>
        </Box>

        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Typography variant="body2" color="textSecondary">
            {tab === 0 ? "没有账号？点击注册" : "已有账号？点击登录"}
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default LoginPage;
