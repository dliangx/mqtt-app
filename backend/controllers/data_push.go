package controllers

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/liang/mqtt-app/backend/database"
	"github.com/liang/mqtt-app/backend/models"
	"github.com/liang/mqtt-app/backend/mqtt"
)

type DeviceData struct {
	Name      string          `json:"name"`
	Topic     string          `json:"topic"`
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

	// Update device location and status
	if input.Longitude != 0 && input.Latitude != 0 {
		device.UserID = userID
		device.Name = input.Name
		device.Topic = input.Topic
		device.Longitude = input.Longitude
		device.Latitude = input.Latitude
		device.Address = input.Address
	}

	if input.Status != "" {
		device.Status = input.Status
	}

	device.LastSeen = time.Now().Unix()
	if err := database.DB.Save(&device).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save device"})
		return
	}

	// Publish to MQTT topic using device's topic field
	topic := device.Topic
	data := map[string]interface{}{

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

	// Generate test data for each device
	testData := []DeviceData{}

	// Generate random number of iterations (1-10)
	rand.Seed(time.Now().UnixNano())
	randomInt := rand.Intn(9) + 1

	// 获取设备ID
	var deviceID int
	database.DB.Raw("SELECT seq FROM sqlite_sequence WHERE name = 'devices'").Row().Scan(&deviceID)

	for i := 0; i < randomInt; i++ {
		// 中国中心点（北京）的经纬度
		baseLongitude := 116.3974
		baseLatitude := 39.9093

		// 生成随机偏移量，覆盖中国及其海面区域
		// 经度范围：约 73°E 到 135°E (73-135)
		// 纬度范围：约 3°N 到 54°N (3-54)
		longitudeOffset := (float64(time.Now().UnixNano()%62000) - 31000) / 1000.0 // ±31度
		latitudeOffset := (float64(time.Now().UnixNano()%51000) - 25500) / 1000.0  // ±25.5度

		longitude := baseLongitude + longitudeOffset
		latitude := baseLatitude + latitudeOffset

		data := DeviceData{
			Name:      fmt.Sprintf("设备 %d", deviceID+i+1),
			Topic:     fmt.Sprintf("device/%d", deviceID+i+1),
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
	var input []DeviceData
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	results := []map[string]interface{}{}

	for _, data := range input {
		// Verify device belongs to user
		var device models.Device

		// Update device location and status
		if data.Longitude != 0 && data.Latitude != 0 {
			device.UserID = userID
			device.Name = data.Name
			device.Topic = data.Topic
			device.Longitude = data.Longitude
			device.Latitude = data.Latitude
			device.Address = data.Address
		}

		if data.Status != "" {
			device.Status = data.Status
		}

		device.LastSeen = time.Now().Unix()
		if err := database.DB.Save(&device).Error; err != nil {
			results = append(results, map[string]interface{}{
				"device_id": device.ID,
				"status":    "error",
				"error":     "Failed to save device",
			})
			continue
		}

		// Publish to MQTT topic using device's topic field
		topic := device.Topic
		mqttData := map[string]interface{}{
			"device_id":  device.ID,
			"longitude":  data.Longitude,
			"latitude":   data.Latitude,
			"address":    data.Address,
			"status":     data.Status,
			"data":       data.Data,
			"timestamp":  data.Timestamp,
			"updated_at": time.Now().Unix(),
		}

		jsonData, err := json.Marshal(mqttData)
		if err != nil {
			results = append(results, map[string]interface{}{
				"device_id": device.ID,
				"status":    "error",
				"error":     "Failed to marshal data",
			})
			continue
		}

		if err := mqtt.Publish(topic, jsonData); err != nil {
			results = append(results, map[string]interface{}{
				"device_id": device.ID,
				"status":    "error",
				"error":     "Failed to publish to MQTT",
			})
			continue
		}

		results = append(results, map[string]interface{}{
			"device_id": device.ID,
			"topic":     topic,
			"longitude": data.Longitude,
			"latitude":  data.Latitude,
			"status":    "success",
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Test data pushed successfully",
		"results": results,
	})
}
