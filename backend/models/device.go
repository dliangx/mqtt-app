package models

import "gorm.io/gorm"

type Device struct {
	gorm.Model
	Name      string  `gorm:"not null" json:"name"`
	Topic     string  `gorm:"uniqueIndex;not null" json:"topic"`
	UserID    uint    `json:"user_id"`
	Longitude float64 `json:"longitude"`
	Latitude  float64 `json:"latitude"`
	Address   string  `json:"address"`
	Status    string  `gorm:"default:'offline'" json:"status"`
	LastSeen  int64   `json:"last_seen"`
}

type Alert struct {
	gorm.Model
	DeviceID  uint   `json:"device_id"`
	Type      string `json:"type"` // emergency, warning, info
	Message   string `json:"message"`
	Level     string `json:"level"` // critical, high, medium, low
	Read      bool   `gorm:"default:false" json:"read"`
	Timestamp int64  `json:"timestamp"`
}
