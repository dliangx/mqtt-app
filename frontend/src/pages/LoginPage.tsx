import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Tabs,
  Tab,
} from "@mui/material";

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState(0);
  const navigate = useNavigate();

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const endpoint = tab === 0 ? "/api/login" : "/api/register";
    try {
      const response = await axios.post(endpoint, { username, password });
      if (tab === 0) {
        // Login
        localStorage.setItem("token", response.data.token);
        navigate("/");
      } else {
        // Register
        alert("Registration successful! Please log in.");
        setTab(0);
      }
    } catch (error: unknown) {
      console.error(
        `Error during ${tab === 0 ? "login" : "registration"}`,
        error,
      );
      if (axios.isAxiosError(error)) {
        alert(
          error.response?.data?.error || `An error occurred. Please try again.`,
        );
      } else {
        alert(`An error occurred. Please try again.`);
      }
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
        <Typography component="h1" variant="h5">
          IoT Platform
        </Typography>
        <Box sx={{ borderBottom: 1, borderColor: "divider", width: "100%" }}>
          <Tabs value={tab} onChange={handleTabChange} centered>
            <Tab label="Login" />
            <Tab label="Register" />
          </Tabs>
        </Box>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Username"
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            {tab === 0 ? "Sign In" : "Sign Up"}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default LoginPage;
