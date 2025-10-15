package controllers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/liang/mqtt-app/backend/database"
	"github.com/liang/mqtt-app/backend/models"
)

func GetAlerts(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	var alerts []models.Alert
	database.DB.Joins("JOIN devices ON devices.id = alerts.device_id").
		Where("devices.user_id = ?", userID).
		Order("alerts.created_at DESC").
		Find(&alerts)

	c.JSON(http.StatusOK, alerts)
}

func GetUnreadAlerts(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	var count int64
	database.DB.Model(&models.Alert{}).
		Joins("JOIN devices ON devices.id = alerts.device_id").
		Where("devices.user_id = ? AND alerts.read = ?", userID, false).
		Count(&count)

	c.JSON(http.StatusOK, gin.H{"count": count})
}

func MarkAlertAsRead(c *gin.Context) {
	id := c.Param("id")
	userID := c.MustGet("userID").(uint)

	var alert models.Alert
	if err := database.DB.Joins("JOIN devices ON devices.id = alerts.device_id").
		Where("alerts.id = ? AND devices.user_id = ?", id, userID).
		First(&alert).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Alert not found"})
		return
	}

	alert.Read = true
	database.DB.Save(&alert)

	c.JSON(http.StatusOK, gin.H{"message": "Alert marked as read"})
}

func CreateAlert(c *gin.Context) {
	var input models.Alert

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify device belongs to user
	userID := c.MustGet("userID").(uint)
	var device models.Device
	if err := database.DB.Where("id = ? AND user_id = ?", input.DeviceID, userID).First(&device).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Device not found"})
		return
	}
	// 获取配置
	var config models.MessageTypeConfig
	if err := database.DB.Where("id = ? AND user_id = ?", input.Type, userID).First(&config).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Message type config not found"})
		return
	}

	// 解析消息数据
	parseData, err := parseMessageData(config.Format, input.RawData)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert parseData.Fields map to JSON string
	parsedDataJSON, err := json.Marshal(parseData.Fields)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to marshal parsed data"})
		return
	}

	input.Timestamp = time.Now().Unix()
	input.ParsedData = string(parsedDataJSON)

	result := database.DB.Create(&input)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create alert"})
		return
	}

	c.JSON(http.StatusOK, input)
}

func MarkAlertsAsRead(c *gin.Context) {
	var input struct {
		IDs []uint `json:"ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.MustGet("userID").(uint)

	// Get device IDs that belong to the user
	var deviceIDs []uint
	if err := database.DB.Model(&models.Device{}).
		Where("user_id = ?", userID).
		Pluck("id", &deviceIDs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user devices"})
		return
	}

	if len(deviceIDs) == 0 {
		c.JSON(http.StatusOK, gin.H{"message": "No alerts to mark as read"})
		return
	}

	// Update alerts that belong to user's devices
	result := database.DB.Model(&models.Alert{}).
		Where("id IN ? AND device_id IN ?", input.IDs, deviceIDs).
		Update("read", true)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark alerts as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Alerts marked as read successfully"})
}

func MarkAllAlertsAsRead(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	// Get device IDs that belong to the user
	var deviceIDs []uint
	if err := database.DB.Model(&models.Device{}).
		Where("user_id = ?", userID).
		Pluck("id", &deviceIDs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user devices"})
		return
	}

	if len(deviceIDs) == 0 {
		c.JSON(http.StatusOK, gin.H{"message": "No alerts to mark as read"})
		return
	}

	// Update alerts that belong to user's devices
	result := database.DB.Model(&models.Alert{}).
		Where("device_id IN ?", deviceIDs).
		Update("read", true)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark all alerts as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "All alerts marked as read successfully"})
}

func DeleteAlert(c *gin.Context) {
	id := c.Param("id")
	userID := c.MustGet("userID").(uint)

	var alert models.Alert
	if err := database.DB.Joins("JOIN devices ON devices.id = alerts.device_id").
		Where("alerts.id = ? AND devices.user_id = ?", id, userID).
		First(&alert).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Alert not found"})
		return
	}

	database.DB.Delete(&alert)

	c.JSON(http.StatusOK, gin.H{"message": "Alert deleted successfully"})
}
