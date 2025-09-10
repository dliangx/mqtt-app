import React from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Chip,
} from "@mui/material";
import {
  Person as PersonIcon,
  ExitToApp as LogoutIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";

interface ProfilePageProps {
  onRefresh: () => void;
  onLogout: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ onRefresh, onLogout }) => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");

  const handleLogout = () => {
    onLogout();
  };

  const handleClearCache = () => {
    localStorage.clear();
    window.location.reload();
  };

  const appInfo = {
    version: "1.0.0",
    buildDate: "2024-01-01",
    environment: "production",
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* User Info */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <PersonIcon sx={{ fontSize: 48, color: "primary.main" }} />
          <Box>
            <Typography variant="h6" component="h1">
              {user.username || "用户"}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {user.email || "未设置邮箱"}
            </Typography>
          </Box>
        </Box>

        <Box display="flex" gap={1} flexWrap="wrap">
          <Chip
            label={`版本: ${appInfo.version}`}
            size="small"
            variant="outlined"
          />
        </Box>
      </Paper>

      {/* Actions */}
      <List>
        {token && (
          <>
            <Divider sx={{ my: 1 }} />
            <ListItem
              button
              onClick={handleLogout}
              sx={{ color: "error.main" }}
            >
              <ListItemIcon sx={{ color: "error.main" }}>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="退出登录" />
            </ListItem>
            <Divider sx={{ my: 1 }} />
          </>
        )}
      </List>

      {/* System Info */}
    </Box>
  );
};

export default ProfilePage;
