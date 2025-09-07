package models

import "gorm.io/gorm"

type Device struct {
	gorm.Model
	Name   string `gorm:"not null" json:"name"`
	Topic  string `gorm:"uniqueIndex;not null" json:"topic"`
	UserID uint   `json:"user_id"`
}
