import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Box,
  Tab,
  Tabs,
  Paper,
  Alert,
  Button,
  Container,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';

import { apiService } from 'src/services/api';

import { useSnackbar } from 'src/components/snackbar';

// ----------------------------------------------------------------------

export default function SignInPage() {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
    setError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (tab === 0) {
        // Login
        const response = await apiService.login({ username, password });
        if (response.data?.token) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          enqueueSnackbar('登录成功', { variant: 'success' });
          navigate('/');
        } else {
          throw new Error('登录响应中缺少token');
        }
      } else {
        // Register
        const registerResponse = await apiService.register({ username, email, password });
        if (registerResponse.data) {
          enqueueSnackbar('注册成功，请登录', { variant: 'success' });
          setTab(0);
          setEmail('');
        } else {
          throw new Error('注册失败');
        }
      }
    } catch (err: any) {
      console.error(`Error during ${tab === 0 ? 'login' : 'registration'}`, err);
      const errorMessage = err.response?.data?.error || '操作失败，请重试';
      setError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            IoT 平台
          </Typography>

          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={tab} onChange={handleTabChange} centered>
              <Tab label="登录" />
              <Tab label="注册" />
            </Tabs>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
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
              autoComplete={tab === 0 ? 'current-password' : 'new-password'}
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
              {loading ? <CircularProgress size={24} /> : tab === 0 ? '登录' : '注册'}
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" align="center">
            {tab === 0 ? '没有账号？' : '已有账号？'}
            <Button size="small" onClick={() => setTab(tab === 0 ? 1 : 0)} sx={{ ml: 1 }}>
              {tab === 0 ? '立即注册' : '立即登录'}
            </Button>
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
}
