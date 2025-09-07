package controllers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/liang/mqtt-app/backend/database"
	"github.com/liang/mqtt-app/backend/models"
)

func CreateDevice(c *gin.Context) {
	var input struct {
		Name      string  `json:"name" binding:"required"`
		Topic     string  `json:"topic" binding:"required"`
		Longitude float64 `json:"longitude"`
		Latitude  float64 `json:"latitude"`
		Address   string  `json:"address"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.MustGet("userID").(uint)

	device := models.Device{
		Name:      input.Name,
		Topic:     input.Topic,
		UserID:    userID,
		Longitude: input.Longitude,
		Latitude:  input.Latitude,
		Address:   input.Address,
		Status:    "offline",
		LastSeen:  time.Now().Unix(),
	}
	result := database.DB.Create(&device)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create device"})
		return
	}

	c.JSON(http.StatusOK, device)
}

func GetDevices(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	var devices []models.Device
	database.DB.Where("user_id = ?", userID).Find(&devices)

	c.JSON(http.StatusOK, devices)
}

func DeleteDevice(c *gin.Context) {
	id := c.Param("id")
	userID := c.MustGet("userID").(uint)

	var device models.Device
	if err := database.DB.Where("id = ?", id).First(&device).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Device not found"})
		return
	}

	if device.UserID != userID {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "You are not authorized to delete this device"})
		return
	}

	database.DB.Delete(&device)

	c.JSON(http.StatusOK, gin.H{"message": "Device deleted successfully"})
}

func UpdateDeviceLocation(c *gin.Context) {
	id := c.Param("id")
	userID := c.MustGet("userID").(uint)

	var input struct {
		Longitude float64 `json:"longitude" binding:"required"`
		Latitude  float64 `json:"latitude" binding:"required"`
		Address   string  `json:"address"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var device models.Device
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&device).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Device not found"})
		return
	}

	device.Longitude = input.Longitude
	device.Latitude = input.Latitude
	device.Address = input.Address
	device.Status = "online"
	device.LastSeen = time.Now().Unix()

	database.DB.Save(&device)

	c.JSON(http.StatusOK, device)
}

func UpdateDeviceStatus(c *gin.Context) {
	id := c.Param("id")
	userID := c.MustGet("userID").(uint)

	var input struct {
		Status string `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var device models.Device
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&device).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Device not found"})
		return
	}

	device.Status = input.Status
	device.LastSeen = time.Now().Unix()

	database.DB.Save(&device)

	c.JSON(http.StatusOK, device)
}
