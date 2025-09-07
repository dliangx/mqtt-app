package mqtt

import (
	"log"

	MQTT "github.com/eclipse/paho.mqtt.golang"
)

var Client MQTT.Client

var messagePubHandler MQTT.MessageHandler = func(client MQTT.Client, msg MQTT.Message) {
	log.Printf("Received message: %s from topic: %s\n", msg.Payload(), msg.Topic())
}

var connectHandler MQTT.OnConnectHandler = func(client MQTT.Client) {
	log.Println("Connected to MQTT broker")
}

var connectLostHandler MQTT.ConnectionLostHandler = func(client MQTT.Client, err error) {
	log.Printf("Connection lost: %v", err)
}

func Connect() {
	opts := MQTT.NewClientOptions()
	opts.AddBroker("tcp://localhost:1883")
	opts.SetClientID("go_mqtt_client")
	opts.SetDefaultPublishHandler(messagePubHandler)
	opts.OnConnect = connectHandler
	opts.OnConnectionLost = connectLostHandler

	Client = MQTT.NewClient(opts)
	if token := Client.Connect(); token.Wait() && token.Error() != nil {
		log.Fatalf("Failed to connect to MQTT broker: %v", token.Error())
	}
}

// Publish publishes a message to the specified topic
func Publish(topic string, payload []byte) error {
	if token := Client.Publish(topic, 0, false, payload); token.Wait() && token.Error() != nil {
		return token.Error()
	}
	log.Printf("Published message to topic: %s", topic)
	return nil
}
