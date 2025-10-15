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
