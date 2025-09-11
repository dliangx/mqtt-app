package controllers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/liang/mqtt-app/backend/database"
	"github.com/liang/mqtt-app/backend/models"
	"golang.org/x/crypto/bcrypt"
)

// GetUsers 获取所有用户
func GetUsers(c *gin.Context) {
	var users []models.User
	result := database.DB.Select("id, username, role, created_at, updated_at").Find(&users)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	type UserResponse struct {
		ID        uint      `json:"id"`
		Username  string    `json:"username"`
		Role      string    `json:"role"`
		CreatedAt time.Time `json:"created_at"`
		UpdatedAt time.Time `json:"updated_at"`
	}

	var response []UserResponse
	for _, user := range users {
		response = append(response, UserResponse{
			ID:        user.ID,
			Username:  user.Username,
			Role:      user.Role,
			CreatedAt: user.CreatedAt,
			UpdatedAt: user.UpdatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{"data": response})
}

// CreateUser 创建新用户
func CreateUser(c *gin.Context) {
	var input struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
		Role     string `json:"role" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 检查用户名是否已存在
	var existingUser models.User
	database.DB.Where("username = ?", input.Username).First(&existingUser)
	if existingUser.ID != 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username already exists"})
		return
	}

	// 加密密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// 创建用户
	user := models.User{
		Username: input.Username,
		Password: string(hashedPassword),
		Role:     input.Role,
	}

	result := database.DB.Create(&user)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// 返回用户信息（不包含密码）
	response := gin.H{
		"id":         user.ID,
		"username":   user.Username,
		"role":       user.Role,
		"created_at": user.CreatedAt,
		"updated_at": user.UpdatedAt,
	}

	c.JSON(http.StatusOK, gin.H{"data": response, "message": "User created successfully"})
}

// UpdateUser 更新用户信息
func UpdateUser(c *gin.Context) {
	var input struct {
		Username string `json:"username" binding:"required"`
		Role     string `json:"role" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 获取用户ID
	userID := c.Param("id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User ID is required"})
		return
	}

	// 查找用户
	var user models.User
	result := database.DB.First(&user, userID)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// 检查用户名是否已被其他用户使用（如果用户名有变化）
	if user.Username != input.Username {
		var existingUser models.User
		database.DB.Where("username = ? AND id != ?", input.Username, userID).First(&existingUser)
		if existingUser.ID != 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Username already exists"})
			return
		}
	}

	// 更新用户信息
	user.Username = input.Username
	user.Role = input.Role

	result = database.DB.Save(&user)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// 返回更新后的用户信息
	response := gin.H{
		"id":         user.ID,
		"username":   user.Username,
		"role":       user.Role,
		"updated_at": user.UpdatedAt,
	}

	c.JSON(http.StatusOK, gin.H{"data": response, "message": "User updated successfully"})
}

// DeleteUser 删除用户
func DeleteUser(c *gin.Context) {
	// 获取用户ID
	userID := c.Param("id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User ID is required"})
		return
	}

	// 查找用户
	var user models.User
	result := database.DB.First(&user, userID)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// 删除用户
	result = database.DB.Delete(&user)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}
