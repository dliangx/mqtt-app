package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/liang/mqtt-app/backend/database"
	"github.com/liang/mqtt-app/backend/models"
	"github.com/liang/mqtt-app/backend/mqtt"
)

type DeviceData struct {
	DeviceID  uint            `json:"device_id"`
	Longitude float64         `json:"longitude"`
	Latitude  float64         `json:"latitude"`
	Address   string          `json:"address"`
	Status    string          `json:"status"`
	Data      json.RawMessage `json:"data"`
	Timestamp int64           `json:"timestamp"`
}

func PushDeviceData(c *gin.Context) {
	var input DeviceData

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.MustGet("userID").(uint)

	// Verify device belongs to user
	var device models.Device
	if err := database.DB.Where("id = ? AND user_id = ?", input.DeviceID, userID).First(&device).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Device not found"})
		return
	}

	// Update device location and status
	if input.Longitude != 0 && input.Latitude != 0 {
		device.Longitude = input.Longitude
		device.Latitude = input.Latitude
		device.Address = input.Address
	}

	if input.Status != "" {
		device.Status = input.Status
	}

	device.LastSeen = time.Now().Unix()
	database.DB.Save(&device)

	// Publish to MQTT topic
	topic := fmt.Sprintf("devices/%d/data", device.ID)
	data := map[string]interface{}{
		"device_id":  device.ID,
		"longitude":  input.Longitude,
		"latitude":   input.Latitude,
		"address":    input.Address,
		"status":     input.Status,
		"data":       input.Data,
		"timestamp":  input.Timestamp,
		"updated_at": time.Now().Unix(),
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to marshal data"})
		return
	}

	if err := mqtt.Publish(topic, jsonData); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to publish to MQTT"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Data pushed successfully",
		"topic":   topic,
		"device":  device,
	})
}

func GenerateTestData(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	// Get user's devices
	var devices []models.Device
	if err := database.DB.Where("user_id = ?", userID).Find(&devices).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get devices"})
		return
	}

	if len(devices) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No devices found"})
		return
	}

	// Generate test data for each device
	testData := []DeviceData{}
	for _, device := range devices {
		// Generate random location around Beijing
		longitude := 116.3974 + (float64(time.Now().UnixNano()%2000)-1000)/100000.0
		latitude := 39.9093 + (float64(time.Now().UnixNano()%2000)-1000)/100000.0

		data := DeviceData{
			DeviceID:  device.ID,
			Longitude: longitude,
			Latitude:  latitude,
			Address:   fmt.Sprintf("测试地址 %d", time.Now().Unix()%1000),
			Status:    "online",
			Data:      json.RawMessage(`{"temperature": 25.5, "humidity": 60, "battery": 85}`),
			Timestamp: time.Now().Unix(),
		}
		testData = append(testData, data)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Test data generated",
		"test_data": testData,
	})
}

func PushTestData(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	// Get user's devices
	var devices []models.Device
	if err := database.DB.Where("user_id = ?", userID).Find(&devices).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get devices"})
		return
	}

	if len(devices) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No devices found"})
		return
	}

	results := []map[string]interface{}{}
	for _, device := range devices {
		// Generate random location around Beijing
		longitude := 116.3974 + (float64(time.Now().UnixNano()%2000)-1000)/100000.0
		latitude := 39.9093 + (float64(time.Now().UnixNano()%2000)-1000)/100000.0

		data := DeviceData{
			DeviceID:  device.ID,
			Longitude: longitude,
			Latitude:  latitude,
			Address:   fmt.Sprintf("测试地址 %d", time.Now().Unix()%1000),
			Status:    "online",
			Data:      json.RawMessage(`{"temperature": 25.5, "humidity": 60, "battery": 85}`),
			Timestamp: time.Now().Unix(),
		}

		// Update device
		device.Longitude = longitude
		device.Latitude = latitude
		device.Address = data.Address
		device.Status = "online"
		device.LastSeen = time.Now().Unix()
		database.DB.Save(&device)

		// Publish to MQTT
		topic := fmt.Sprintf("devices/%d/data", device.ID)
		mqttData := map[string]interface{}{
			"device_id": device.ID,
			"longitude": longitude,
			"latitude":  latitude,
			"address":   data.Address,
			"status":    "online",
			"data":      data.Data,
			"timestamp": time.Now().Unix(),
		}

		jsonData, _ := json.Marshal(mqttData)
		mqtt.Publish(topic, jsonData)

		results = append(results, map[string]interface{}{
			"device_id": device.ID,
			"topic":     topic,
			"longitude": longitude,
			"latitude":  latitude,
			"status":    "success",
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Test data pushed successfully",
		"results": results,
	})
}
