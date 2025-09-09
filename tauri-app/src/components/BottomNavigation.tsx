import React from "react";
import { BottomNavigation, BottomNavigationAction, Badge } from "@mui/material";
import {
  Monitor as MonitorIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
} from "@mui/icons-material";

interface BottomNavigationProps {
  currentTab: number;
  onTabChange: (newValue: number) => void;
  unreadAlerts?: number;
}

const AppBottomNavigation: React.FC<BottomNavigationProps> = ({
  currentTab,
  onTabChange,
  unreadAlerts = 0,
}) => {
  return (
    <BottomNavigation
      value={currentTab}
      onChange={(_, newValue) => onTabChange(newValue)}
      showLabels
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: "#fff",
        borderTop: "1px solid #e0e0e0",
        height: "64px",
      }}
    >
      <BottomNavigationAction
        label="监控"
        icon={<MonitorIcon />}
        sx={{
          minWidth: "60px",
          "&.Mui-selected": {
            color: "#1976d2",
          },
        }}
      />
      <BottomNavigationAction
        label="管理"
        icon={<SettingsIcon />}
        sx={{
          minWidth: "60px",
          "&.Mui-selected": {
            color: "#1976d2",
          },
        }}
      />
      <BottomNavigationAction
        label="消息"
        icon={
          unreadAlerts > 0 ? (
            <Badge badgeContent={unreadAlerts} color="error">
              <NotificationsIcon />
            </Badge>
          ) : (
            <NotificationsIcon />
          )
        }
        sx={{
          minWidth: "60px",
          "&.Mui-selected": {
            color: "#1976d2",
          },
        }}
      />
      <BottomNavigationAction
        label="我的"
        icon={<PersonIcon />}
        sx={{
          minWidth: "60px",
          "&.Mui-selected": {
            color: "#1976d2",
          },
        }}
      />
    </BottomNavigation>
  );
};

export default AppBottomNavigation;
