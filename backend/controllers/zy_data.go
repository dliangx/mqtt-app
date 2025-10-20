package controllers

import (
	"encoding/binary"
	"encoding/hex"
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/liang/mqtt-app/backend/database"
	"github.com/liang/mqtt-app/backend/models"
)

// ZYDataPacket represents the structure of ZY TCP data packet
type ZYDataPacket struct {
	Total_len   uint32
	Cmd_code    uint8
	Token       []byte
	Msg_id_len  uint8
	Msg_id      []byte
	Content_len uint16
	Content     []byte
}

// ParseZYDataPacket parses raw TCP data into ZYDataPacket structure
func ParseZYDataPacket(data []byte) (*ZYDataPacket, error) {
	if len(data) < 30 {
		return nil, fmt.Errorf("packet too short: %d bytes", len(data))
	}

	packet := &ZYDataPacket{
		Total_len:  binary.BigEndian.Uint32(data[0:4]),
		Cmd_code:   data[4],
		Token:      data[5:24],
		Msg_id_len: data[24],
	}

	// Calculate positions based on variable length msg_id
	msgIdStart := 25
	msgIdEnd := msgIdStart + int(packet.Msg_id_len)
	if msgIdEnd > len(data) {
		return nil, fmt.Errorf("invalid msg_id length")
	}
	packet.Msg_id = data[msgIdStart:msgIdEnd]

	// Parse content_len
	contentLenStart := msgIdEnd
	if contentLenStart+4 > len(data) {
		return nil, fmt.Errorf("packet too short for content_len")
	}
	packet.Content_len = binary.BigEndian.Uint16(data[contentLenStart : contentLenStart+2])

	// Parse content
	contentStart := contentLenStart + 2
	contentEnd := contentStart + int(packet.Content_len)
	if contentEnd > len(data) {
		return nil, fmt.Errorf("invalid content length")
	}
	packet.Content = data[contentStart:contentEnd]

	return packet, nil
}

// ProcessZYData processes the parsed ZY data packet
func ProcessZYData(packet *ZYDataPacket) error {
	// Extract device ID from msg_id
	deviceID := strings.TrimSpace(string(packet.Msg_id))
	if deviceID == "" {
		return fmt.Errorf("empty device ID")
	}

	// Use current timestamp since the new structure doesn't have timestamp field
	timestamp := uint32(time.Now().Unix())

	// Parse command code
	cmdCode := fmt.Sprintf("%02X", packet.Cmd_code)

	// Process based on command code
	switch cmdCode {
	case "01": // Location data
		return processLocationData(deviceID, timestamp, packet.Content)
	case "02": // Status data
		return processStatusData(deviceID, timestamp, packet.Content)
	case "03": // Alert data
		return processAlertData(deviceID, timestamp, packet.Content)
	default:
		return fmt.Errorf("unknown command code: %s", cmdCode)
	}
}

// processLocationData processes location data from ZY packet
func processLocationData(deviceID string, timestamp uint32, data []byte) error {
	// Parse the hex-encoded content data
	hexContent := hex.EncodeToString(data)
	contentData, err := parseContentData(hexContent)
	if err != nil {
		return fmt.Errorf("failed to parse location data: %v", err)
	}

	// Find or create device
	var device models.Device
	result := database.DB.Where("topic = ?", deviceID).First(&device)
	if result.Error != nil {
		// Device not found, create a new one
		device = models.Device{
			Name:      deviceID,
			Topic:     deviceID,
			UserID:    1, // Default user ID, adjust as needed
			Longitude: contentData.Longitude,
			Latitude:  contentData.Latitude,
			Status:    "online",
			LastSeen:  int64(timestamp),
		}
		database.DB.Create(&device)
	} else {
		// Update existing device
		device.Longitude = contentData.Longitude
		device.Latitude = contentData.Latitude
		device.Status = "online"
		device.LastSeen = int64(timestamp)
		database.DB.Save(&device)
	}

	fmt.Printf("Updated device %s location: lat=%f, lng=%f\n", deviceID, contentData.Latitude, contentData.Longitude)
	return nil
}

// processStatusData processes status data from ZY packet
func processStatusData(deviceID string, timestamp uint32, data []byte) error {
	// Parse the hex-encoded content data
	hexContent := hex.EncodeToString(data)
	contentData, err := parseContentData(hexContent)
	if err != nil {
		return fmt.Errorf("failed to parse status data: %v", err)
	}

	// Determine status based on device type and other factors
	status := "online" // Default status
	_ = contentData    // Mark as used for now

	// Update device status
	var device models.Device
	result := database.DB.Where("topic = ?", deviceID).First(&device)
	if result.Error == nil {
		device.Status = status
		device.LastSeen = int64(timestamp)
		database.DB.Save(&device)
	}

	fmt.Printf("Updated device %s status: %s\n", deviceID, status)
	return nil
}

// processAlertData processes alert data from ZY packet
func processAlertData(deviceID string, timestamp uint32, data []byte) error {
	// Parse the hex-encoded content data
	hexContent := hex.EncodeToString(data)
	contentData, err := parseContentData(hexContent)
	if err != nil {
		return fmt.Errorf("failed to parse alert data: %v", err)
	}

	// Use device type as alert type indicator
	alertType := contentData.DeviceType
	alertLevel := uint8(0) // Default alert level
	_ = contentData        // Mark as used for now

	// Find device by topic to get device ID
	var device models.Device
	result := database.DB.Where("topic = ?", deviceID).First(&device)
	if result.Error != nil {
		fmt.Printf("Device not found for alert: %s\n", deviceID)
		return nil
	}

	// Create alert record
	alert := models.Alert{
		DeviceID:  device.ID,
		Type:      "warning",
		Message:   fmt.Sprintf("Device %s alert: type=%d, level=%d", deviceID, alertType, alertLevel),
		Level:     "medium", // Adjust based on alert level
		Read:      false,
		Timestamp: int64(timestamp),
		RawData:   fmt.Sprintf("alert_type=%d,alert_level=%d", alertType, alertLevel),
	}

	database.DB.Create(&alert)

	fmt.Printf("Created alert for device %s: %s\n", deviceID, alert.Message)
	return nil
}

// HandleZyTCPData handles incoming TCP data for ZY protocol
func HandleZyTCPData(data []byte, conn net.Conn) {
	packet, err := ParseZYDataPacket(data)
	if err != nil {
		fmt.Printf("Error parsing ZY packet: %v\n", err)
		conn.Write([]byte("ERROR: " + err.Error()))
		return
	}

	// Process the packet
	err = ProcessZYData(packet)
	if err != nil {
		fmt.Printf("Error processing ZY data: %v\n", err)
		conn.Write([]byte("ERROR: " + err.Error()))
		return
	}

	// Send success response
	response := []byte("SUCCESS")
	conn.Write(response)
}

// ZyForwardData and related functions remain for HTTP forwarding
type ZyForwardData struct {
	Supplier    string   `json:"supplier"`
	TotalLen    *int     `json:"totalLen"`
	CmdCode     *string  `json:"cmdCode"`
	Token       string   `json:"token"`
	MsgIDLen    *int     `json:"msgIdLen"`
	MsgID       string   `json:"msgId"`
	ContentLen  int      `json:"contentLen"`
	Content     string   `json:"content"`
	ContentList []string `json:"contentList"`
	DataCount   int      `json:"dataCount"`
}

type ZyForwardDataResponse struct {
	TotalLen *int    `json:"totalLen"`
	CmdCode  *string `json:"cmdCode"`
	Result   string  `json:"result"`
}

// ContentData represents the parsed content structure
type ContentData struct {
	DeviceType  uint8   // 业务及终端类型标识
	DateTime    string  // 日期时间
	Latitude    float64 // 纬度信息
	Longitude   float64 // 经度信息
	Altitude    int16   // 海拔高度
	SNR         int8    // 信噪比
	Temperature int8    // 温度
	Voltage     float64 // 电压
}

// parseContentData parses the hex-encoded content data
func parseContentData(hexContent string) (*ContentData, error) {
	// Decode hex string to bytes
	contentBytes, err := hex.DecodeString(hexContent)
	if err != nil {
		return nil, fmt.Errorf("failed to decode hex content: %v", err)
	}

	if len(contentBytes) < 20 {
		return nil, fmt.Errorf("content data too short: %d bytes", len(contentBytes))
	}

	data := &ContentData{}

	// 业务及终端类型标识 (1字节)
	data.DeviceType = contentBytes[0]

	// 日期时间 (6字节): 年+月+日+时+分+秒
	year := int(contentBytes[1]) + 2000
	month := time.Month(contentBytes[2])
	day := int(contentBytes[3])
	hour := int(contentBytes[4])
	minute := int(contentBytes[5])
	second := int(contentBytes[6])
	data.DateTime = fmt.Sprintf("%04d-%02d-%02d %02d:%02d:%02d", year, month, day, hour, minute, second)

	// 纬度信息 (4字节): 实际数值*1000000
	latitudeRaw := binary.BigEndian.Uint32(contentBytes[7:11])
	// 检查最高位是否为1（南纬）
	if latitudeRaw&0x80000000 != 0 {
		// 南纬，清除最高位并取负
		data.Latitude = -float64(latitudeRaw&0x7FFFFFFF) / 1000000.0
	} else {
		// 北纬
		data.Latitude = float64(latitudeRaw) / 1000000.0
	}

	// 经度信息 (4字节): 实际数值*1000000
	longitudeRaw := binary.BigEndian.Uint32(contentBytes[11:15])
	// 检查最高位是否为1（西经）
	if longitudeRaw&0x80000000 != 0 {
		// 西经，清除最高位并取负
		data.Longitude = -float64(longitudeRaw&0x7FFFFFFF) / 1000000.0
	} else {
		// 东经
		data.Longitude = float64(longitudeRaw) / 1000000.0
	}

	// 海拔高度 (2字节): 实际海拔+500
	altitudeRaw := binary.BigEndian.Uint16(contentBytes[15:17])
	data.Altitude = int16(altitudeRaw) - 500

	// 信噪比 (1字节): 有符号数，取值范围-15~15
	data.SNR = int8(contentBytes[17])

	// 温度 (1字节): 实际数值+50
	data.Temperature = int8(contentBytes[18]) - 50

	// 电压 (1字节): 实际数值*1000/50
	data.Voltage = float64(contentBytes[19]) * 50.0 / 1000.0

	return data, nil
}

func HandleZyForwardData(c *gin.Context) {
	var data ZyForwardData
	if err := c.ShouldBindJSON(&data); err != nil {
		response := ZyForwardDataResponse{
			Result: err.Error(),
		}
		c.JSON(http.StatusBadRequest, response)
		return
	}

	var response ZyForwardDataResponse

	// Process the data here
	if data.DataCount <= 0 {
		response = ZyForwardDataResponse{
			TotalLen: data.TotalLen,
			CmdCode:  data.CmdCode,
			Result:   "no data",
		}
	} else if data.DataCount > 0 && data.DataCount <= 1 {
		// Parse single content data
		if data.Content != "" {
			contentData, err := parseContentData(data.Content)
			if err != nil {
				response = ZyForwardDataResponse{
					TotalLen: data.TotalLen,
					CmdCode:  data.CmdCode,
					Result:   fmt.Sprintf("parse error: %v", err),
				}
			} else {
				// Process the parsed data (save to database, etc.)
				fmt.Printf("Parsed content data: %+v\n", contentData)
				response = ZyForwardDataResponse{
					TotalLen: data.TotalLen,
					CmdCode:  data.CmdCode,
					Result:   "success",
				}
			}
		} else {
			response = ZyForwardDataResponse{
				TotalLen: data.TotalLen,
				CmdCode:  data.CmdCode,
				Result:   "no content data",
			}
		}
	} else if data.DataCount > 1 {
		// Process multiple content data from ContentList
		successCount := 0
		for i, content := range data.ContentList {
			if content != "" {
				contentData, err := parseContentData(content)
				if err != nil {
					fmt.Printf("Error parsing content %d: %v\n", i, err)
				} else {
					fmt.Printf("Parsed content data %d: %+v\n", i, contentData)
					successCount++
				}
			}
		}
		response = ZyForwardDataResponse{
			TotalLen: data.TotalLen,
			CmdCode:  data.CmdCode,
			Result:   fmt.Sprintf("processed %d/%d items", successCount, data.DataCount),
		}
	}

	c.JSON(http.StatusOK, response)
}
