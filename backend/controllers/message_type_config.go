package controllers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/liang/mqtt-app/backend/database"
	"github.com/liang/mqtt-app/backend/models"
)

// GetMessageTypeConfigs 获取用户的消息类型配置
func GetMessageTypeConfigs(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	var configs []models.MessageTypeConfig
	if err := database.DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&configs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch message type configs"})
		return
	}

	c.JSON(http.StatusOK, configs)
}

// GetMessageTypeConfig 获取单个消息类型配置
func GetMessageTypeConfig(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	id := c.Param("id")

	var config models.MessageTypeConfig
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&config).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Message type config not found"})
		return
	}

	c.JSON(http.StatusOK, config)
}

// CreateMessageTypeConfig 创建消息类型配置
func CreateMessageTypeConfig(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	var input struct {
		Name        string          `json:"name" binding:"required"`
		Description string          `json:"description"`
		Protocol    string          `json:"protocol" binding:"required"`
		Format      json.RawMessage `json:"format" binding:"required"`
		IsDefault   bool            `json:"is_default"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 验证格式是否为有效的JSON
	var format models.MessageFormat
	if err := json.Unmarshal(input.Format, &format); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid format JSON"})
		return
	}

	// 如果设置为默认配置，取消其他默认配置
	if input.IsDefault {
		if err := database.DB.Model(&models.MessageTypeConfig{}).
			Where("user_id = ? AND is_default = ?", userID, true).
			Update("is_default", false).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update default configs"})
			return
		}
	}

	config := models.MessageTypeConfig{
		UserID:      userID,
		Name:        input.Name,
		Description: input.Description,
		Protocol:    input.Protocol,
		Format:      string(input.Format),
		IsDefault:   input.IsDefault,
	}

	if err := database.DB.Create(&config).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create message type config"})
		return
	}

	c.JSON(http.StatusOK, config)
}

// UpdateMessageTypeConfig 更新消息类型配置
func UpdateMessageTypeConfig(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	id := c.Param("id")

	var config models.MessageTypeConfig
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&config).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Message type config not found"})
		return
	}

	var input struct {
		Name        string          `json:"name"`
		Description string          `json:"description"`
		Protocol    string          `json:"protocol"`
		Format      json.RawMessage `json:"format"`
		IsDefault   bool            `json:"is_default"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 验证格式是否为有效的JSON（如果提供了）
	if input.Format != nil {
		var format models.MessageFormat
		if err := json.Unmarshal(input.Format, &format); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid format JSON"})
			return
		}
		config.Format = string(input.Format)
	}

	// 如果设置为默认配置，取消其他默认配置
	if input.IsDefault && !config.IsDefault {
		if err := database.DB.Model(&models.MessageTypeConfig{}).
			Where("user_id = ? AND is_default = ?", userID, true).
			Update("is_default", false).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update default configs"})
			return
		}
	}

	if input.Name != "" {
		config.Name = input.Name
	}
	if input.Description != "" {
		config.Description = input.Description
	}
	if input.Protocol != "" {
		config.Protocol = input.Protocol
	}
	config.IsDefault = input.IsDefault

	if err := database.DB.Save(&config).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update message type config"})
		return
	}

	c.JSON(http.StatusOK, config)
}

// DeleteMessageTypeConfig 删除消息类型配置
func DeleteMessageTypeConfig(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	id := c.Param("id")

	var config models.MessageTypeConfig
	if err := database.DB.Where("id = ? AND user_id = ?", id, userID).First(&config).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Message type config not found"})
		return
	}

	if err := database.DB.Delete(&config).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete message type config"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Message type config deleted successfully"})
}

// SetDefaultMessageTypeConfig 设置默认消息类型配置
func SetDefaultMessageTypeConfig(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	id := c.Param("id")

	// 先取消所有默认配置
	if err := database.DB.Model(&models.MessageTypeConfig{}).
		Where("user_id = ? AND is_default = ?", userID, true).
		Update("is_default", false).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update default configs"})
		return
	}

	// 设置新的默认配置
	if err := database.DB.Model(&models.MessageTypeConfig{}).
		Where("id = ? AND user_id = ?", id, userID).
		Update("is_default", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to set default config"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Default message type config set successfully"})
}

// ParseMessageData 解析消息数据
func ParseMessageData(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	var input struct {
		ConfigID uint   `json:"config_id" binding:"required"`
		RawData  string `json:"raw_data" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 获取配置
	var config models.MessageTypeConfig
	if err := database.DB.Where("id = ? AND user_id = ?", input.ConfigID, userID).First(&config).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Message type config not found"})
		return
	}

	// 解析消息数据
	result, err := parseMessageData(config.Format, input.RawData)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// parseMessageData 解析消息数据的辅助函数
func parseMessageData(formatStr, rawData string) (models.ParseResult, error) {
	var format models.MessageFormat
	if err := json.Unmarshal([]byte(formatStr), &format); err != nil {
		return models.ParseResult{Success: false, Error: "Invalid format configuration"}, err
	}

	result := models.ParseResult{
		Success:   true,
		Fields:    make(map[string]interface{}),
		RawData:   rawData,
		Timestamp: time.Now(),
	}

	// 这里实现具体的解析逻辑
	// 根据format配置解析rawData

	return result, nil
}

// GetDefaultMessageTypeConfig 获取用户的默认消息类型配置
func GetDefaultMessageTypeConfig(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	var config models.MessageTypeConfig
	if err := database.DB.Where("user_id = ? AND is_default = ?", userID, true).First(&config).Error; err != nil {
		// 如果没有默认配置，返回第一个配置
		if err := database.DB.Where("user_id = ?", userID).First(&config).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "No message type config found"})
			return
		}
	}

	c.JSON(http.StatusOK, config)
}

// TestMessageFormat 测试消息格式配置
func TestMessageFormat(c *gin.Context) {

	var input struct {
		Format   json.RawMessage `json:"format" binding:"required"`
		TestData string          `json:"test_data" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 验证格式是否为有效的JSON
	var format models.MessageFormat
	if err := json.Unmarshal(input.Format, &format); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid format JSON"})
		return
	}

	// 测试解析
	result, err := parseMessageData(string(input.Format), input.TestData)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}
