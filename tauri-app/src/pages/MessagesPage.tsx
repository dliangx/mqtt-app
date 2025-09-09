import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  List,
  ListItem,
  Divider,
  AppBar,
  Toolbar,
} from "@mui/material";
import { Notifications as NotificationsIcon } from "@mui/icons-material";
import type { Alert as AlertType } from "../types";

interface MessagesPageProps {
  alerts: AlertType[];
  unreadCount: number;
  loading: boolean;
  onMarkAsRead: (alertId: string) => void;
  onRefresh: () => void;
}

const MessagesPage: React.FC<MessagesPageProps> = ({
  alerts,

  loading,
  onMarkAsRead,
}) => {
  const [testMode, setTestMode] = useState(false);
  const [testAlerts, setTestAlerts] = useState<AlertType[]>([]);

  useEffect(() => {
    // 生成测试数据
    const generateTestAlerts = () => {
      const testData: AlertType[] = [];
      const devices = ["设备A", "设备B", "设备C", "设备D", "设备E"];
      const severities = ["critical", "warning", "info"] as const;
      const messages = [
        "温度异常升高，请立即检查",
        "设备离线，连接中断",
        "电池电量低，请及时充电",
        "GPS信号丢失",
        "数据上传异常",
        "设备重启完成",
        "固件更新可用",
        "内存使用率过高",
        "网络连接不稳定",
        "传感器数据异常",
      ];

      for (let i = 1; i <= 20; i++) {
        const deviceIndex = i % devices.length;
        const severityIndex = i % severities.length;
        const messageIndex = i % messages.length;

        testData.push({
          id: i,
          device_id: deviceIndex + 1,
          type: "alert",
          message: messages[messageIndex],
          level: severities[severityIndex] as "critical" | "warning" | "info",
          severity: severities[severityIndex],
          read: i > 10, // 前10条未读，后10条已读
          timestamp: Date.now() - i * 3600000, // 按小时递减
          created_at: new Date(Date.now() - i * 3600000).toISOString(),
          updated_at: new Date(Date.now() - i * 3600000).toISOString(),
          device: {
            id: deviceIndex + 1,
            name: devices[deviceIndex],
            topic: `device/${deviceIndex + 1}`,
            user_id: 1,
            longitude: 116.3974 + deviceIndex * 0.01,
            latitude: 39.9093 + deviceIndex * 0.01,
            address: `北京市朝阳区第${deviceIndex + 1}号`,
            status:
              i % 3 === 0 ? "online" : i % 3 === 1 ? "offline" : "warning",
            last_seen: Date.now() - deviceIndex * 60000,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        });
      }
      return testData;
    };

    // 如果没有真实数据，启用测试模式
    if (alerts.length === 0 && !loading) {
      setTestMode(true);
      setTestAlerts(generateTestAlerts());
    }
  }, [alerts, loading]);

  const displayAlerts = testMode ? testAlerts : alerts;
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "error";
      case "warning":
        return "warning";
      case "info":
        return "info";
      default:
        return "default";
    }
  };

  const getSeverityIconColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "error";
      case "warning":
        return "warning";
      case "info":
        return "info";
      default:
        return "default";
    }
  };

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case "critical":
        return "严重";
      case "warning":
        return "警告";
      case "info":
        return "信息";
      default:
        return severity;
    }
  };

  const formatTimestamp = (timestamp: number | string) => {
    const date = new Date(
      typeof timestamp === "string" ? timestamp : timestamp,
    );
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "刚刚";
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString();
  };

  return (
    <div>
      {/* AppBar Header */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          backgroundColor: "rgba(245, 245, 245, 0.95)",
          color: "black",
          borderRadius: 0,
        }}
      >
        <Toolbar sx={{ justifyContent: "center" }}>
          <Typography>消息中心</Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 2, mt: 8 }}>
        {/* Test Mode Indicator */}
        {testMode && (
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="body2" color="warning.dark">
              测试模式：显示20条模拟消息数据
            </Typography>
          </Paper>
        )}

        {/* Alerts List */}
        {displayAlerts.length > 0 ? (
          <List>
            {displayAlerts.map((alert, index) => (
              <React.Fragment key={alert.id}>
                <ListItem
                  component={Card}
                  variant="outlined"
                  sx={{
                    mb: 1,
                    backgroundColor: alert.read
                      ? "transparent"
                      : "action.hover",
                  }}
                >
                  <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
                    <Box
                      display="flex"
                      justifyContent="flex-start"
                      alignItems="center"
                      gap={1}
                      mb={0.5}
                    >
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <NotificationsIcon
                          color={
                            getSeverityIconColor(alert.severity) as
                              | "error"
                              | "warning"
                              | "info"
                              | "default"
                          }
                          fontSize="small"
                        />
                        <Typography variant="body2" component="h3">
                          {alert.device?.name || "未知设备"}
                        </Typography>
                      </Box>
                      <Chip
                        label={getSeverityText(alert.severity)}
                        color={getSeverityColor(alert.severity)}
                        size="small"
                      />
                    </Box>

                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {alert.message}
                    </Typography>

                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="caption" color="textSecondary">
                        {formatTimestamp(alert.timestamp)}
                      </Typography>

                      {!alert.read && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => onMarkAsRead(alert.id.toString())}
                          sx={{ minWidth: "auto", px: 1 }}
                        >
                          标记已读
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Paper sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="body2" color="textSecondary">
              {loading ? "加载中..." : "暂无消息"}
            </Typography>
          </Paper>
        )}
      </Box>
    </div>
  );
};

export default MessagesPage;
