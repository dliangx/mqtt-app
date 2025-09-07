package controllers

import (
	"log"
	"net/http"

	MQTT "github.com/eclipse/paho.mqtt.golang"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/liang/mqtt-app/backend/database"
	"github.com/liang/mqtt-app/backend/models"
	"github.com/liang/mqtt-app/backend/mqtt"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins
	},
}

func WsHandler(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("Failed to upgrade connection:", err)
		return
	}
	defer conn.Close()

	userID := c.MustGet("userID").(uint)

	var devices []models.Device
	database.DB.Where("user_id = ?", userID).Find(&devices)

	if len(devices) == 0 {
		log.Println("No devices found for user:", userID)
		conn.WriteMessage(websocket.TextMessage, []byte("No devices configured for monitoring."))
		return
	}

	// Create a map of topics to subscribe to.
	topics := make(map[string]byte)
	for _, device := range devices {
		topics[device.Topic] = 0 // QoS 0
	}

	// Channel to pass messages from MQTT to WebSocket
	msgChan := make(chan []byte)

	// Define the message handler for this specific connection
	messageHandler := func(client MQTT.Client, msg MQTT.Message) {
		log.Printf("Forwarding message from topic %s to WebSocket", msg.Topic())
		msgChan <- msg.Payload()
	}

	// Subscribe to the topics
	if token := mqtt.Client.SubscribeMultiple(topics, messageHandler); token.Wait() && token.Error() != nil {
		log.Println("Failed to subscribe to topics:", token.Error())
		return
	}
	log.Printf("Subscribed to topics for user %d", userID)

	// Unsubscribe when the function returns
	defer func() {
		topicList := []string{}
		for topic := range topics {
			topicList = append(topicList, topic)
		}
		if len(topicList) > 0 {
			if token := mqtt.Client.Unsubscribe(topicList...); token.Wait() && token.Error() != nil {
				log.Println("Failed to unsubscribe from topics:", token.Error())
			}
			log.Printf("Unsubscribed from topics for user %d", userID)
		}
	}()

	// Goroutine to write messages to WebSocket
	go func() {
		for msg := range msgChan {
			if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				log.Println("Error writing to WebSocket:", err)
				return // Exit goroutine on error
			}
		}
	}()

	// Keep the connection alive by reading from it
	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			log.Println("WebSocket read error (client disconnected?):", err)
			close(msgChan) // Close channel to terminate writer goroutine
			break
		}
	}
}
