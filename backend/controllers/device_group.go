package controllers

import (
	"fmt"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

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
	// 处理表单数据
	name := c.PostForm("name")
	description := c.PostForm("description")

	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "设备组名称不能为空"})
		return
	}

	// 处理文件上传
	var iconURL string
	file, err := c.FormFile("icon")
	if err == nil {
		// 验证文件类型
		if !isValidSVGFile(file) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "只支持SVG格式的图标文件"})
			return
		}

		// 保存文件
		iconURL, err = saveUploadedFile(c, file)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "文件上传失败: " + err.Error()})
			return
		}
	}

	group := models.DeviceGroup{
		Name:        name,
		Description: description,
		IconURL:     iconURL,
	}
	result := database.DB.Create(&group)

	if result.Error != nil {
		// 如果创建失败，删除已上传的文件
		if iconURL != "" {
			os.Remove(filepath.Join("uploads", "icons", filepath.Base(iconURL)))
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create device group"})
		return
	}

	c.JSON(http.StatusOK, group)
}

// UpdateDeviceGroup 更新设备组
func UpdateDeviceGroup(c *gin.Context) {
	id := c.Param("id")

	var group models.DeviceGroup
	if err := database.DB.First(&group, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Device group not found"})
		return
	}

	// 处理表单数据
	name := c.PostForm("name")
	description := c.PostForm("description")

	if name != "" {
		group.Name = name
	}
	if description != "" {
		group.Description = description
	}

	// 处理文件上传
	file, err := c.FormFile("icon")
	if err == nil {
		// 验证文件类型
		if !isValidSVGFile(file) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "只支持SVG格式的图标文件"})
			return
		}

		// 保存新文件
		iconURL, err := saveUploadedFile(c, file)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "文件上传失败: " + err.Error()})
			return
		}

		// 删除旧文件
		if group.IconURL != "" {
			oldFilename := filepath.Base(group.IconURL)
			os.Remove(filepath.Join("uploads", "icons", oldFilename))
		}

		group.IconURL = iconURL
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

	// 删除关联的图标文件
	if group.IconURL != "" {
		filename := filepath.Base(group.IconURL)
		os.Remove(filepath.Join("uploads", "icons", filename))
	}

	database.DB.Delete(&group)

	c.JSON(http.StatusOK, gin.H{"message": "Device group deleted successfully"})
}

// isValidSVGFile 验证文件是否为SVG格式
func isValidSVGFile(file *multipart.FileHeader) bool {
	// 检查文件扩展名
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".svg" {
		return false
	}

	// 检查MIME类型
	contentType := file.Header.Get("Content-Type")
	if contentType != "image/svg+xml" && contentType != "text/xml" && contentType != "application/xml" {
		return false
	}

	return true
}

// saveUploadedFile 保存上传的文件
func saveUploadedFile(c *gin.Context, file *multipart.FileHeader) (string, error) {
	// 创建上传目录
	uploadDir := "uploads/icons"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", fmt.Errorf("创建上传目录失败: %v", err)
	}

	// 生成唯一文件名
	ext := filepath.Ext(file.Filename)
	timestamp := time.Now().Unix()
	randomStr := fmt.Sprintf("%d", time.Now().UnixNano()%10000)
	filename := fmt.Sprintf("icon_%d_%s%s", timestamp, randomStr, ext)
	filePath := filepath.Join(uploadDir, filename)

	// 保存文件
	if err := c.SaveUploadedFile(file, filePath); err != nil {
		return "", fmt.Errorf("保存文件失败: %v", err)
	}

	// 返回访问URL
	return "/uploads/icons/" + filename, nil
}
