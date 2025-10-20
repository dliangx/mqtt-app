package main

import (
	"embed"
	"io/fs"
	"net"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/liang/mqtt-app/backend/controllers"
	"github.com/liang/mqtt-app/backend/database"
	"github.com/liang/mqtt-app/backend/middleware"
	"github.com/liang/mqtt-app/backend/mqtt"
)

//go:embed frontend/dist
var embeddedFrontend embed.FS

func main() {
	r := gin.Default()

	// Add CORS middleware
	r.Use(middleware.CORSMiddleware())

	// Connect to database
	database.ConnectDatabase()

	// Connect to MQTT broker
	mqtt.Connect()

	// API routes
	api := r.Group("/api")
	{
		// Auth routes
		api.POST("/register", controllers.Register)
		api.POST("/login", controllers.Login)

		// 中移数据 data route
		api.POST("/zy-forward-data", controllers.HandleZyForwardData)

		// Authenticated routes
		auth := api.Group("/")
		auth.Use(middleware.AuthMiddleware())
		{
			// Device routes
			auth.GET("/devices", controllers.GetDevices)
			auth.POST("/devices", controllers.CreateDevice)
			auth.PUT("/devices/:id", controllers.UpdateDevice)
			auth.DELETE("/devices/:id", controllers.DeleteDevice)
			auth.PUT("/devices/:id/location", controllers.UpdateDeviceLocation)
			auth.PUT("/devices/:id/status", controllers.UpdateDeviceStatus)

			// Alert routes
			auth.GET("/alerts", controllers.GetAlerts)
			auth.GET("/alerts/unread", controllers.GetUnreadAlerts)
			auth.POST("/alerts", controllers.CreateAlert)
			auth.PUT("/alerts/:id/read", controllers.MarkAlertAsRead)
			auth.PUT("/alerts/read", controllers.MarkAlertsAsRead)
			auth.PUT("/alerts/read-all", controllers.MarkAllAlertsAsRead)
			auth.DELETE("/alerts/:id", controllers.DeleteAlert)

			// Message type config routes
			auth.GET("/message-types", controllers.GetMessageTypeConfigs)
			auth.GET("/message-types/default", controllers.GetDefaultMessageTypeConfig)
			auth.GET("/message-types/:id", controllers.GetMessageTypeConfig)
			auth.POST("/message-types", controllers.CreateMessageTypeConfig)
			auth.PUT("/message-types/:id", controllers.UpdateMessageTypeConfig)
			auth.DELETE("/message-types/:id", controllers.DeleteMessageTypeConfig)
			auth.PUT("/message-types/:id/default", controllers.SetDefaultMessageTypeConfig)
			auth.POST("/message-types/parse", controllers.ParseMessageData)
			auth.POST("/message-types/test", controllers.TestMessageFormat)

			auth.POST("/message-types/geo-test-data", controllers.GetGeoTestData)
			auth.POST("/message-types/geo-config", controllers.CreateGeoConfig)

			// Data push routes
			auth.POST("/data/push", controllers.PushDeviceData)
			auth.POST("/data/generate-test", controllers.GenerateTestData)
			auth.POST("/data/push-test", controllers.PushTestData)

			// WebSocket route
			auth.GET("/ws", controllers.WsHandler)

			// User routes
			auth.GET("/users", controllers.GetUsers)
			auth.POST("/users", controllers.CreateUser)
			auth.PUT("/users/:id", controllers.UpdateUser)
			auth.DELETE("/users/:id", controllers.DeleteUser)

			// Device group routes
			auth.GET("/device-groups", controllers.GetDeviceGroups)
			auth.POST("/device-groups", controllers.CreateDeviceGroup)
			auth.PUT("/device-groups/:id", controllers.UpdateDeviceGroup)
			auth.DELETE("/device-groups/:id", controllers.DeleteDeviceGroup)
		}
	}

	// Serve embedded frontend files
	distFS, err := fs.Sub(embeddedFrontend, "frontend/dist")
	if err != nil {
		panic("Failed to create sub filesystem for frontend: " + err.Error())
	}

	fileServer := http.FileServer(http.FS(distFS))
	r.NoRoute(func(c *gin.Context) {
		// Only serve frontend for non-API routes
		if !strings.HasPrefix(c.Request.RequestURI, "/api") {
			// For SPA routing, serve index.html for any non-API route that doesn't match a file
			if !fileExists(distFS, c.Request.URL.Path) && c.Request.URL.Path != "/" {
				c.Request.URL.Path = "/"
			}
			fileServer.ServeHTTP(c.Writer, c.Request)
		}
	})

	// Start HTTP server in a goroutine
	go func() {
		r.Run(":8080") // listen and serve on 0.0.0.0:8080
	}()

	// Start TCP server for ZY data
	go startZyTCPServer(":8081")

	// Keep main goroutine running
	select {}
}

// startZyTCPServer starts a TCP server to handle ZY data
func startZyTCPServer(address string) {
	listener, err := net.Listen("tcp", address)
	if err != nil {
		panic("Failed to start TCP server: " + err.Error())
	}
	defer listener.Close()

	println("ZY TCP Server listening on " + address)

	for {
		conn, err := listener.Accept()
		if err != nil {
			println("Error accepting connection:", err.Error())
			continue
		}

		go handleZyConnection(conn)
	}
}

// handleZyConnection handles individual TCP connections for ZY data
func handleZyConnection(conn net.Conn) {
	defer conn.Close()

	buffer := make([]byte, 1024)
	for {
		n, err := conn.Read(buffer)
		if err != nil {
			println("Error reading from connection:", err.Error())
			return
		}

		if n > 0 {
			// Process the TCP packet data using the controller
			controllers.HandleZyTCPData(buffer[:n], conn)
		}
	}
}

// fileExists checks if a file exists in the embedded filesystem
func fileExists(fs fs.FS, path string) bool {
	if path == "" || path == "/" {
		return false
	}

	// Remove leading slash
	if path[0] == '/' {
		path = path[1:]
	}

	_, err := fs.Open(path)
	return err == nil
}
