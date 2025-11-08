package controllers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/liang/mqtt-app/backend/database"
	"github.com/liang/mqtt-app/backend/models"
)

func CreateDevice(c *gin.Context) {
	var input struct {
		Name      string  `json:"name" binding:"required"`
		Topic     string  `json:"topic" binding:"required"`
		GroupID   *uint   `json:"group_id"`
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
		GroupID:   input.GroupID,
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

	// 获取分页参数
	page := c.DefaultQuery("page", "0")
	pageSize := c.DefaultQuery("page_size", "0")

	var pageNum, pageSizeNum int

	// 如果提供了分页参数，进行分页查询
	if page != "0" || pageSize != "0" {
		// 解析页码
		if page != "0" {
			if p, err := strconv.Atoi(page); err == nil && p > 0 {
				pageNum = p
			} else {
				pageNum = 1
			}
		} else {
			pageNum = 1
		}

		// 解析每页大小
		if pageSize != "0" {
			if ps, err := strconv.Atoi(pageSize); err == nil && ps > 0 {
				pageSizeNum = ps
			} else {
				pageSizeNum = 10
			}
		} else {
			pageSizeNum = 10
		}

		offset := (pageNum - 1) * pageSizeNum

		var devices []models.Device
		var total int64

		// 获取总数
		database.DB.Model(&models.Device{}).Where("user_id = ?", userID).Count(&total)

		// 获取分页数据
		database.DB.Preload("DeviceGroup").
			Where("user_id = ?", userID).
			Offset(offset).
			Limit(pageSizeNum).
			Find(&devices)

		c.JSON(http.StatusOK, gin.H{
			"data": devices,
			"pagination": gin.H{
				"page":       pageNum,
				"page_size":  pageSizeNum,
				"total":      total,
				"total_page": (total + int64(pageSizeNum) - 1) / int64(pageSizeNum),
			},
		})
		return
	}

	// 如果没有分页参数，返回全部数据
	var devices []models.Device
	database.DB.Preload("DeviceGroup").Where("user_id = ?", userID).Find(&devices)

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

	var input models.Device

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

func UpdateDevice(c *gin.Context) {
	id := c.Param("id")
	userID := c.MustGet("userID").(uint)

	var input models.Device

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var device models.Device
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&device).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Device not found"})
		return
	}

	// Update only the fields that are provided
	if input.Name != "" {
		device.Name = input.Name
	}
	if input.Topic != "" {
		device.Topic = input.Topic
	}
	if input.GroupID != nil {
		device.GroupID = input.GroupID
	}
	if input.Longitude != 0 {
		device.Longitude = input.Longitude
	}
	if input.Latitude != 0 {
		device.Latitude = input.Latitude
	}
	if input.Address != "" {
		device.Address = input.Address
	}

	database.DB.Save(&device)

	c.JSON(http.StatusOK, device)
}
