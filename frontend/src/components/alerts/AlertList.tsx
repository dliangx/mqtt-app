import React, { useState, useEffect } from "react";
import type { Alert } from "../../types";
import { apiService } from "../../services/api";

interface AlertListProps {
  showUnreadOnly?: boolean;
  maxItems?: number;
  onAlertClick?: (alert: Alert) => void;
}

const AlertList: React.FC<AlertListProps> = ({
  showUnreadOnly = false,
  maxItems = 10,
  onAlertClick,
}) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetchAlerts();
  }, [showUnreadOnly]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAlerts();
      let filteredAlerts = Array.isArray(response) ? [...response] : [];

      if (showUnreadOnly) {
        filteredAlerts = filteredAlerts.filter((alert) => !alert.read);
      }

      if (maxItems > 0) {
        filteredAlerts = filteredAlerts.slice(0, maxItems);
      }

      setAlerts(filteredAlerts);
    } catch (err) {
      setError("获取报警信息失败");
      console.error("Failed to fetch alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (alertId: number) => {
    try {
      await apiService.markAlertAsRead(alertId);
      setAlerts(
        alerts.map((alert) =>
          alert.id === alertId ? { ...alert, read: true } : alert,
        ),
      );
    } catch (err) {
      console.error("Failed to mark alert as read:", err);
    }
  };

  const deleteAlert = async (alertId: number) => {
    try {
      await apiService.deleteAlert(alertId);
      setAlerts(alerts.filter((alert) => alert.id !== alertId));
    } catch (err) {
      console.error("Failed to delete alert:", err);
    }
  };

  const getAlertLevelColor = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-red-100 border-red-400 text-red-800";
      case "high":
        return "bg-orange-100 border-orange-400 text-orange-800";
      case "medium":
        return "bg-yellow-100 border-yellow-400 text-yellow-800";
      case "low":
        return "bg-blue-100 border-blue-400 text-blue-800";
      default:
        return "bg-gray-100 border-gray-400 text-gray-800";
    }
  };

  const getAlertLevelText = (level: string) => {
    switch (level) {
      case "critical":
        return "严重";
      case "high":
        return "高";
      case "medium":
        return "中";
      case "low":
        return "低";
      default:
        return level;
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case "emergency":
        return "🚨";
      case "warning":
        return "⚠️";
      case "info":
        return "ℹ️";
      default:
        return "📋";
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString("zh-CN");
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-50 border border-red-200 rounded-lg">
        {error}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-lg">
        {showUnreadOnly ? "暂无未读报警" : "暂无报警信息"}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
            alert.read ? "opacity-70" : "border-l-4"
          } ${getAlertLevelColor(alert.level)}`}
          onClick={() => onAlertClick?.(alert)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{getAlertTypeIcon(alert.type)}</span>
                <span className="font-semibold">{alert.message}</span>
                {!alert.read && (
                  <span className="px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                    未读
                  </span>
                )}
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <div>
                  <span className="font-medium">级别: </span>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      alert.level === "critical"
                        ? "bg-red-200"
                        : alert.level === "high"
                          ? "bg-orange-200"
                          : alert.level === "medium"
                            ? "bg-yellow-200"
                            : "bg-blue-200"
                    }`}
                  >
                    {getAlertLevelText(alert.level)}
                  </span>
                </div>
                <div>
                  <span className="font-medium">时间: </span>
                  {formatTimestamp(alert.timestamp)}
                </div>
                {alert.device && (
                  <div>
                    <span className="font-medium">设备: </span>
                    {alert.device.name}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 ml-4">
              {!alert.read && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(alert.id);
                  }}
                  className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                >
                  标记已读
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteAlert(alert.id);
                }}
                className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AlertList;
