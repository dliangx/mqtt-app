package database

import (
	"github.com/liang/mqtt-app/backend/models"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDatabase() {
	database, err := gorm.Open(sqlite.Open("mqtt_app.db"), &gorm.Config{})
	if err != nil {
		panic("Failed to connect to database!")
	}

	err = database.AutoMigrate(&models.User{}, &models.Device{}, &models.DeviceGroup{},
		&models.Alert{}, &models.MessageType{}, &models.MessageTypeConfig{})
	if err != nil {
		panic("Failed to migrate database!")
	}

	DB = database
}
