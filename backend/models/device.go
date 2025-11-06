package models

import (
	"time"

	"gorm.io/gorm"
)

// DeviceGroup 设备组
type DeviceGroup struct {
	gorm.Model
	Name        string `gorm:"not null" json:"name"`
	Description string `json:"description"`
	IconURL     string `json:"icon_url"` // SVG图标URL
}

type Device struct {
	gorm.Model
	Name        string      `gorm:"not null" json:"name"`
	Topic       string      `gorm:"uniqueIndex;not null" json:"topic"`
	UserID      uint        `json:"user_id"`
	GroupID     *uint       `json:"group_id"` // 可为空的设备组ID
	Longitude   float64     `json:"longitude"`
	Latitude    float64     `json:"latitude"`
	Address     string      `json:"address"`
	Status      string      `gorm:"default:'offline'" json:"status"`
	LastSeen    int64       `json:"last_seen"`
	DeviceGroup DeviceGroup `gorm:"foreignKey:GroupID" json:"device_group,omitempty"`
}

type Alert struct {
	gorm.Model
	DeviceID   uint   `json:"device_id"`
	Type       string `json:"type"` // emergency, warning, info
	Message    string `json:"message"`
	Level      string `json:"level"` // critical, high, medium, low
	Read       bool   `gorm:"default:false" json:"read"`
	Timestamp  int64  `json:"timestamp"`
	RawData    string `json:"raw_data" gorm:"type:text"`    // 原始字节数据
	ParsedData string `json:"parsed_data" gorm:"type:text"` // 解析后的数据
}

type MessageType struct {
	gorm.Model
	Type        string `gorm:"not null" json:"type"`
	Name        string `gorm:"not null" json:"name"`
	Description string `json:"description"`
}

// MessageTypeConfig 消息类型配置
type MessageTypeConfig struct {
	gorm.Model
	UserID      uint   `json:"user_id" gorm:"index"`
	Name        string `json:"name" gorm:"size:100"`        // 配置名称
	Description string `json:"description" gorm:"size:255"` // 配置描述
	Protocol    string `json:"protocol" gorm:"size:50"`     // 协议类型: tcp, udp, mqtt, etc.
	Format      string `json:"format" gorm:"type:text"`     // 数据格式配置(JSON)
	IsDefault   bool   `json:"is_default" gorm:"default:false"`
}

// FieldDefinition 字段定义
type FieldDefinition struct {
	Name     string `json:"name"`     // 字段名称
	Type     string `json:"type"`     // 字段类型: int8, uint8, int16, uint16, int32, uint32, float32, float64, string, bytes
	Offset   int    `json:"offset"`   // 字节偏移量
	Length   int    `json:"length"`   // 字段长度(字节数)
	Endian   string `json:"endian"`   // 字节序: big, little
	Signed   bool   `json:"signed"`   // 是否有符号
	Decimals int    `json:"decimals"` // 小数位数(浮点数)
	Unit     string `json:"unit"`     // 单位
}

// MessageFormat 消息格式配置
type MessageFormat struct {
	Header    []FieldDefinition `json:"header"`    // 报文头字段
	Body      []FieldDefinition `json:"body"`      // 报文体字段
	Footer    []FieldDefinition `json:"footer"`    // 报文尾字段
	Checksum  *FieldDefinition  `json:"checksum"`  // 校验和字段
	Length    *FieldDefinition  `json:"length"`    // 长度字段
	Delimiter string            `json:"delimiter"` // 分隔符
	Encoding  string            `json:"encoding"`  // 编码: hex, base64, ascii
}

// ParseResult 解析结果
type ParseResult struct {
	Success   bool                   `json:"success"`
	Error     string                 `json:"error,omitempty"`
	Fields    map[string]interface{} `json:"fields"`
	RawData   string                 `json:"raw_data"`
	Timestamp time.Time              `json:"timestamp"`
}
