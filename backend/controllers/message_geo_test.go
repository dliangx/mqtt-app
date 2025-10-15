package controllers

import (
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"testing"
	"time"

	"github.com/liang/mqtt-app/backend/database"
	"github.com/liang/mqtt-app/backend/models"
)

// TestCreateGeoLocationConfig 测试创建设备地理信息上报配置
func TestCreateGeoLocationConfig(t *testing.T) {
	userID := 1

	// 创建设备地理信息上报配置
	geoLocationFormat := models.MessageFormat{
		Header: []models.FieldDefinition{
			{Name: "message_type", Type: "uint8", Offset: 0, Length: 1},
			{Name: "device_id", Type: "string", Offset: 1, Length: 8},
		},
		Body: []models.FieldDefinition{
			{Name: "latitude", Type: "float32", Offset: 9, Length: 4, Endian: "big", Signed: true},
			{Name: "longitude", Type: "float32", Offset: 13, Length: 4, Endian: "big", Signed: true},
			{Name: "altitude", Type: "float32", Offset: 17, Length: 4, Endian: "big", Signed: true},
			{Name: "speed", Type: "float32", Offset: 21, Length: 4, Endian: "big", Signed: true},
			{Name: "direction", Type: "uint16", Offset: 25, Length: 2, Endian: "big"},
			{Name: "timestamp", Type: "uint32", Offset: 27, Length: 4, Endian: "big"},
			{Name: "status", Type: "uint8", Offset: 31, Length: 1},
		},
		Footer:   []models.FieldDefinition{},
		Encoding: "hex",
	}

	formatJSON, err := json.Marshal(geoLocationFormat)
	if err != nil {
		fmt.Println("error", "Failed to create format JSON")
		return
	}

	// 如果设置为默认配置，取消其他默认配置
	database.ConnectDatabase()
	if err := database.DB.Model(&models.MessageTypeConfig{}).
		Where("user_id = ? AND is_default = ?", userID, true).
		Update("is_default", false).Error; err != nil {
		fmt.Println("error", "Failed to update default configs")
		return
	}

	config := models.MessageTypeConfig{
		UserID:      1,
		Name:        "设备地理信息上报",
		Description: "用于设备上报地理位置信息，包含经纬度、海拔、速度、方向等数据",
		Protocol:    "mqtt",
		Format:      string(formatJSON),
		IsDefault:   true,
	}

	if err := database.DB.Create(&config).Error; err != nil {
		fmt.Println("error", "Failed to create message type config")
		return
	}

	// 生成10条测试数据
	testData := generateGeoLocationTestData(config.ID)

	// 将测试数据转换为JSON字符串并打印
	jsonData, err := json.MarshalIndent(testData, "", "  ")
	if err != nil {
		fmt.Println("Error marshaling test data to JSON:", err)
		return
	}
	fmt.Println(string(jsonData))
}

// generateGeoLocationTestData 生成设备地理信息测试数据
func generateGeoLocationTestData(configID uint) []string {
	// 北京中心坐标
	baseLatitude := 39.90923
	baseLongitude := 116.397428

	testData := make([]string, 0)

	for i := 0; i < 10; i++ {
		// 生成随机的经纬度偏移（大约1公里范围内）
		latOffset := (float64(i) - 5.0) * 0.01
		lngOffset := (float64(i) - 5.0) * 0.01

		latitude := baseLatitude + latOffset
		longitude := baseLongitude + lngOffset

		// 创建32字节的二进制数据缓冲区（根据配置的总长度）
		data := make([]byte, 32)

		// Header字段
		// message_type: uint8, offset 0, length 1
		data[0] = 0x01 // 地理信息消息类型

		// device_id: string, offset 1, length 8
		deviceID := fmt.Sprintf("device%02d", i+1)
		copy(data[1:9], []byte(deviceID))

		// Body字段
		// latitude: float32, offset 9, length 4, big endian, signed
		latBytes := make([]byte, 4)
		binary.BigEndian.PutUint32(latBytes, math.Float32bits(float32(latitude)))
		copy(data[9:13], latBytes)

		// longitude: float32, offset 13, length 4, big endian, signed
		lngBytes := make([]byte, 4)
		binary.BigEndian.PutUint32(lngBytes, math.Float32bits(float32(longitude)))
		copy(data[13:17], lngBytes)

		// altitude: float32, offset 17, length 4, big endian, signed
		altBytes := make([]byte, 4)
		binary.BigEndian.PutUint32(altBytes, math.Float32bits(float32(50.0+float64(i)*10)))
		copy(data[17:21], altBytes)

		// speed: float32, offset 21, length 4, big endian, signed
		speedBytes := make([]byte, 4)
		binary.BigEndian.PutUint32(speedBytes, math.Float32bits(float32(30.0+float64(i)*5)))
		copy(data[21:25], speedBytes)

		// direction: uint16, offset 25, length 2, big endian
		binary.BigEndian.PutUint16(data[25:27], uint16(i*36))

		// timestamp: uint32, offset 27, length 4, big endian
		binary.BigEndian.PutUint32(data[27:31], uint32(time.Now().Unix()))

		// status: uint8, offset 31, length 1
		data[31] = uint8(i % 3)

		// 转换为十六进制字符串
		hexData := hex.EncodeToString(data)

		// 获取配置
		var config models.MessageTypeConfig
		err := database.DB.Where("id = ? AND user_id = ?", configID, 1).First(&config).Error
		if err != nil {
			return nil
		}

		// 解析消息数据
		result, err := parseMessageData(config.Format, hexData)
		if err != nil {
			return nil
		}
		fmt.Println(result)
		testData = append(testData, hexData)

	}

	return testData
}
