package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/liang/mqtt-app/backend/database"
	"github.com/liang/mqtt-app/backend/models"
)

// GetDeviceGroups 获取所有设备组
func GetDeviceGroups(c *gin.Context) {
	var groups []models.DeviceGroup
	result := database.DB.Find(&groups)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch device groups"})
		return
	}

	c.JSON(http.StatusOK, groups)
}

// CreateDeviceGroup 创建设备组
func CreateDeviceGroup(c *gin.Context) {
	var input struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	group := models.DeviceGroup{
		Name:        input.Name,
		Description: input.Description,
	}
	result := database.DB.Create(&group)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create device group"})
		return
	}

	c.JSON(http.StatusOK, group)
}

// UpdateDeviceGroup 更新设备组
func UpdateDeviceGroup(c *gin.Context) {
	id := c.Param("id")

	var input struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var group models.DeviceGroup
	if err := database.DB.First(&group, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Device group not found"})
		return
	}

	if input.Name != "" {
		group.Name = input.Name
	}
	if input.Description != "" {
		group.Description = input.Description
	}

	database.DB.Save(&group)

	c.JSON(http.StatusOK, group)
}

// DeleteDeviceGroup 删除设备组
func DeleteDeviceGroup(c *gin.Context) {
	id := c.Param("id")

	var group models.DeviceGroup
	if err := database.DB.First(&group, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Device group not found"})
		return
	}

	// 检查是否有设备使用该组
	var deviceCount int64
	database.DB.Model(&models.Device{}).Where("group_id = ?", id).Count(&deviceCount)
	if deviceCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete device group with associated devices"})
		return
	}

	database.DB.Delete(&group)

	c.JSON(http.StatusOK, gin.H{"message": "Device group deleted successfully"})
}
