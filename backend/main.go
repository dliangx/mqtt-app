package main

import (
	"embed"
	"io/fs"
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

		// Authenticated routes
		auth := api.Group("/")
		auth.Use(middleware.AuthMiddleware())
		{
			// Device routes
			auth.GET("/devices", controllers.GetDevices)
			auth.POST("/devices", controllers.CreateDevice)
			auth.DELETE("/devices/:id", controllers.DeleteDevice)

			// WebSocket route
			auth.GET("/ws", controllers.WsHandler)
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

	r.Run(":8080") // listen and serve on 0.0.0.0:8080
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
