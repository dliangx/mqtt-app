package controllers

import (
	"encoding/base64"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strings"
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

	c.JSON(http.StatusOK, gin.H{"data": configs})
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

	c.JSON(http.StatusOK, gin.H{"data": config})
}

// CreateMessageTypeConfig 创建消息类型配置
func CreateMessageTypeConfig(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

	var input struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
		Protocol    string `json:"protocol" binding:"required"`
		Format      string `json:"format" binding:"required"`
		IsDefault   bool   `json:"is_default"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 验证格式是否为有效的JSON
	var format models.MessageFormat
	if err := json.Unmarshal([]byte(input.Format), &format); err != nil {
		fmt.Println(err)
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

	c.JSON(http.StatusOK, gin.H{"data": config})
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
		Name        string `json:"name"`
		Description string `json:"description"`
		Protocol    string `json:"protocol"`
		Format      string `json:"format"`
		IsDefault   bool   `json:"is_default"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 验证格式是否为有效的JSON（如果提供了）

	var format models.MessageFormat
	if err := json.Unmarshal([]byte(input.Format), &format); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid format JSON"})
		return
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

	c.JSON(http.StatusOK, gin.H{"data": config})
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
	// 由于 formatStr 是从数据库读取的 JSON 字符串，需要先检查它是否是有效的 JSON
	// 如果是字符串形式的 JSON，需要先解析它
	if formatStr[0] == '"' && formatStr[len(formatStr)-1] == '"' {
		// 如果是引号包围的字符串，先去除引号
		unquotedStr := formatStr[1 : len(formatStr)-1]
		if err := json.Unmarshal([]byte(unquotedStr), &format); err != nil {
			return models.ParseResult{Success: false, Error: "Invalid format configuration"}, err
		}
	} else {
		// 直接是 JSON 对象
		if err := json.Unmarshal([]byte(formatStr), &format); err != nil {
			return models.ParseResult{Success: false, Error: "Invalid format configuration"}, err
		}
	}

	result := models.ParseResult{
		Success:   true,
		Fields:    make(map[string]interface{}),
		RawData:   rawData,
		Timestamp: time.Now(),
	}

	// 根据编码类型解码原始数据
	var decodedData []byte
	var err error
	switch format.Encoding {
	case "hex":
		decodedData, err = hex.DecodeString(rawData)
	case "base64":
		decodedData, err = base64.StdEncoding.DecodeString(rawData)
	case "ascii", "":
		decodedData = []byte(rawData)
	default:
		return models.ParseResult{Success: false, Error: "Unsupported encoding: " + format.Encoding}, nil
	}

	if err != nil {
		return models.ParseResult{Success: false, Error: "Failed to decode data: " + err.Error()}, err
	}

	// 解析报文头字段
	currentOffset := 0
	for _, field := range format.Header {
		value, newOffset, err := parseField(decodedData, currentOffset, field)
		if err != nil {
			return models.ParseResult{Success: false, Error: "Failed to parse header field '" + field.Name + "': " + err.Error()}, err
		}
		result.Fields[field.Name] = value
		currentOffset = newOffset
	}

	// 解析长度字段（如果存在）
	if format.Length != nil {
		lengthValue, newOffset, err := parseField(decodedData, currentOffset, *format.Length)
		if err != nil {
			return models.ParseResult{Success: false, Error: "Failed to parse length field: " + err.Error()}, err
		}
		currentOffset = newOffset

		// 根据长度字段调整数据范围
		if length, ok := lengthValue.(int64); ok {
			// 确保有足够的数据
			if currentOffset+int(length) > len(decodedData) {
				return models.ParseResult{Success: false, Error: "Insufficient data for specified length"}, nil
			}
			decodedData = decodedData[:currentOffset+int(length)]
		}
	}

	// 解析报文体字段
	for _, field := range format.Body {
		value, newOffset, err := parseField(decodedData, currentOffset, field)
		if err != nil {
			return models.ParseResult{Success: false, Error: "Failed to parse body field '" + field.Name + "': " + err.Error()}, err
		}
		result.Fields[field.Name] = value
		currentOffset = newOffset
	}

	// 解析报文尾字段
	for _, field := range format.Footer {
		value, newOffset, err := parseField(decodedData, currentOffset, field)
		if err != nil {
			return models.ParseResult{Success: false, Error: "Failed to parse footer field '" + field.Name + "': " + err.Error()}, err
		}
		result.Fields[field.Name] = value
		currentOffset = newOffset
	}

	// 解析校验和字段（如果存在）
	if format.Checksum != nil {
		checksumValue, _, err := parseField(decodedData, currentOffset, *format.Checksum)
		if err != nil {
			return models.ParseResult{Success: false, Error: "Failed to parse checksum field: " + err.Error()}, err
		}
		result.Fields[format.Checksum.Name] = checksumValue

		// 验证校验和
		if !validateChecksum(decodedData, currentOffset, *format.Checksum, checksumValue) {
			result.Success = false
			result.Error = "Checksum validation failed"
			return result, nil
		}
	}

	return result, nil
}

// parseField 解析单个字段
func parseField(data []byte, offset int, field models.FieldDefinition) (interface{}, int, error) {
	// 检查偏移量是否有效
	if offset < 0 || offset >= len(data) {
		return nil, offset, fmt.Errorf("invalid offset: %d", offset)
	}

	// 检查是否有足够的数据
	if offset+field.Length > len(data) {
		return nil, offset, fmt.Errorf("insufficient data for field '%s' (need %d bytes, have %d)", field.Name, field.Length, len(data)-offset)
	}

	fieldData := data[offset : offset+field.Length]
	newOffset := offset + field.Length

	switch field.Type {
	case "int8":
		value := int8(fieldData[0])
		if !field.Signed {
			value = int8(uint8(fieldData[0]))
		}
		return value, newOffset, nil

	case "uint8":
		return uint8(fieldData[0]), newOffset, nil

	case "int16":
		var value int16
		if field.Endian == "big" {
			value = int16(binary.BigEndian.Uint16(fieldData))
		} else {
			value = int16(binary.LittleEndian.Uint16(fieldData))
		}
		if !field.Signed {
			if field.Endian == "big" {
				value = int16(binary.BigEndian.Uint16(fieldData))
			} else {
				value = int16(binary.LittleEndian.Uint16(fieldData))
			}
		} else {
			// For signed values, we need to handle two's complement
			if field.Endian == "big" {
				value = int16(binary.BigEndian.Uint16(fieldData))
			} else {
				value = int16(binary.LittleEndian.Uint16(fieldData))
			}
		}
		return value, newOffset, nil

	case "uint16":
		if field.Endian == "big" {
			return binary.BigEndian.Uint16(fieldData), newOffset, nil
		}
		return binary.LittleEndian.Uint16(fieldData), newOffset, nil

	case "int32":
		var value int32
		if field.Endian == "big" {
			value = int32(binary.BigEndian.Uint32(fieldData))
		} else {
			value = int32(binary.LittleEndian.Uint32(fieldData))
		}
		if !field.Signed {
			if field.Endian == "big" {
				value = int32(binary.BigEndian.Uint32(fieldData))
			} else {
				value = int32(binary.LittleEndian.Uint32(fieldData))
			}
		} else {
			// For signed values, we need to handle two's complement
			if field.Endian == "big" {
				value = int32(binary.BigEndian.Uint32(fieldData))
			} else {
				value = int32(binary.LittleEndian.Uint32(fieldData))
			}
		}
		return value, newOffset, nil

	case "uint32":
		if field.Endian == "big" {
			return binary.BigEndian.Uint32(fieldData), newOffset, nil
		}
		return binary.LittleEndian.Uint32(fieldData), newOffset, nil

	case "float32":
		var bits uint32
		if field.Endian == "big" {
			bits = binary.BigEndian.Uint32(fieldData)
		} else {
			bits = binary.LittleEndian.Uint32(fieldData)
		}
		value := math.Float32frombits(bits)
		if field.Decimals > 0 {
			// 应用小数位数
			value = float32(int64(value*float32(math.Pow10(field.Decimals)))) / float32(math.Pow10(field.Decimals))
		}
		return value, newOffset, nil

	case "float64":
		var bits uint64
		if field.Endian == "big" {
			bits = binary.BigEndian.Uint64(fieldData)
		} else {
			bits = binary.LittleEndian.Uint64(fieldData)
		}
		value := math.Float64frombits(bits)
		if field.Decimals > 0 {
			// 应用小数位数
			value = float64(int64(value*math.Pow10(field.Decimals))) / math.Pow10(field.Decimals)
		}
		return value, newOffset, nil

	case "string":
		// 去除字符串末尾的空字符
		str := string(fieldData)
		// 找到第一个空字符
		if idx := strings.IndexByte(str, 0); idx != -1 {
			str = str[:idx]
		}

		return strings.TrimSpace(str), newOffset, nil

	case "bytes":
		return fieldData, newOffset, nil

	default:
		return nil, newOffset, fmt.Errorf("unsupported field type: %s", field.Type)
	}
}

// validateChecksum 验证校验和
func validateChecksum(data []byte, checksumOffset int, checksumField models.FieldDefinition, checksumValue interface{}) bool {
	// 计算数据的校验和（从开始到校验和字段之前）
	dataToCheck := data[:checksumOffset]

	// 根据校验和字段类型进行验证
	switch checksumField.Type {
	case "uint8":
		expected, ok := checksumValue.(uint8)
		if !ok {
			return false
		}
		return calculateChecksum8(dataToCheck) == expected

	case "uint16":
		expected, ok := checksumValue.(uint16)
		if !ok {
			return false
		}
		return calculateChecksum16(dataToCheck) == expected

	case "uint32":
		expected, ok := checksumValue.(uint32)
		if !ok {
			return false
		}
		return calculateChecksum32(dataToCheck) == expected

	default:
		// 对于其他类型，暂时不支持校验和验证
		return true
	}
}

// calculateChecksum8 计算8位校验和
func calculateChecksum8(data []byte) uint8 {
	var sum uint8
	for _, b := range data {
		sum += b
	}
	return sum
}

// calculateChecksum16 计算16位校验和
func calculateChecksum16(data []byte) uint16 {
	var sum uint16
	for _, b := range data {
		sum += uint16(b)
	}
	return sum
}

// calculateChecksum32 计算32位校验和
func calculateChecksum32(data []byte) uint32 {
	var sum uint32
	for _, b := range data {
		sum += uint32(b)
	}
	return sum
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

func CreateGeoConfig(c *gin.Context) {
	userID := c.MustGet("userID").(uint)

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
		Footer: []models.FieldDefinition{},

		Encoding: "hex",
	}

	formatJSON, err := json.Marshal(geoLocationFormat)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create format JSON"})
		return
	}

	// 如果设置为默认配置，取消其他默认配置

	if err := database.DB.Model(&models.MessageTypeConfig{}).
		Where("user_id = ? AND is_default = ?", userID, true).
		Update("is_default", false).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update default configs"})
		return
	}

	config := models.MessageTypeConfig{
		UserID:      userID,
		Name:        "设备地理信息上报",
		Description: "用于设备上报地理位置信息，包含经纬度、海拔、速度、方向等数据",
		Protocol:    "mqtt",
		Format:      string(formatJSON),
		IsDefault:   true,
	}

	if err := database.DB.Create(&config).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create message type config"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "消息类型配置创建成功",
		"data":    config,
	})
}

func GetGeoTestData(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	var config models.MessageTypeConfig
	if err := database.DB.Where("user_id = ? AND name = ?", userID, "设备地理信息上报").First(&config).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get message type config"})
		return
	}
	// 生成10条测试数据
	testData := generateGeoTestData(config.UserID, config.ID)

	// 返回测试数据
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "轨迹追踪数据生成成功",
		"data":    testData,
	})
}

// generateGeoLocationTestData 生成设备地理信息测试数据
func generateGeoTestData(userID, configID uint) []string {
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
		err := database.DB.Where("id = ? AND user_id = ?", configID, userID).First(&config).Error
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
