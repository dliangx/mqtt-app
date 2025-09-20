package controllers

import (
	"encoding/base64"
	"encoding/json"
	"testing"

	"github.com/liang/mqtt-app/backend/models"
)

func TestParseMessageData(t *testing.T) {
	// Test case 1: Simple hex-encoded message with header and body
	t.Run("Hex encoded message with header and body", func(t *testing.T) {
		format := models.MessageFormat{
			Header: []models.FieldDefinition{
				{Name: "message_type", Type: "uint8", Offset: 0, Length: 1},
				{Name: "version", Type: "uint8", Offset: 1, Length: 1},
			},
			Body: []models.FieldDefinition{
				{Name: "temperature", Type: "int16", Offset: 2, Length: 2, Endian: "big", Signed: true},
				{Name: "humidity", Type: "uint8", Offset: 4, Length: 1},
			},
			Encoding: "hex",
		}

		formatJSON, _ := json.Marshal(format)
		rawData := "010209C403" // message_type=1, version=2, temperature=2500 (25.00°C), humidity=3%

		result, err := parseMessageData(string(formatJSON), rawData)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if !result.Success {
			t.Fatalf("Parsing failed: %s", result.Error)
		}

		if result.Fields["message_type"] != uint8(1) {
			t.Errorf("Expected message_type=1, got %v", result.Fields["message_type"])
		}
		if result.Fields["version"] != uint8(2) {
			t.Errorf("Expected version=2, got %v", result.Fields["version"])
		}
		if result.Fields["temperature"] != int16(2500) {
			t.Errorf("Expected temperature=2500, got %v", result.Fields["temperature"])
		}
		if result.Fields["humidity"] != uint8(3) {
			t.Errorf("Expected humidity=3, got %v", result.Fields["humidity"])
		}
	})

	// Test case 2: Base64 encoded message with string field
	t.Run("Base64 encoded message with string field", func(t *testing.T) {
		format := models.MessageFormat{
			Body: []models.FieldDefinition{
				{Name: "device_id", Type: "string", Offset: 0, Length: 8},
				{Name: "status", Type: "uint8", Offset: 8, Length: 1},
			},
			Encoding: "base64",
		}

		formatJSON, _ := json.Marshal(format)
		// "device00" + status byte (1)
		rawData := base64.StdEncoding.EncodeToString([]byte("device00\x01"))

		result, err := parseMessageData(string(formatJSON), rawData)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if !result.Success {
			t.Fatalf("Parsing failed: %s", result.Error)
		}

		if result.Fields["device_id"] != "device00" {
			t.Errorf("Expected device_id='device00', got '%v'", result.Fields["device_id"])
		}
		if result.Fields["status"] != uint8(1) {
			t.Errorf("Expected status=1, got %v", result.Fields["status"])
		}
	})

	// Test case 2b: Base64 encoded message with binary status
	t.Run("Base64 encoded message with binary status", func(t *testing.T) {
		format := models.MessageFormat{
			Body: []models.FieldDefinition{
				{Name: "device_id", Type: "string", Offset: 0, Length: 8},
				{Name: "status", Type: "uint8", Offset: 8, Length: 1},
			},
			Encoding: "base64",
		}

		formatJSON, _ := json.Marshal(format)
		// "device00" + status byte (1) - using proper binary encoding
		deviceData := make([]byte, 9)
		copy(deviceData, "device00")
		deviceData[8] = 1 // Binary value 1
		rawData := base64.StdEncoding.EncodeToString(deviceData)

		result, err := parseMessageData(string(formatJSON), rawData)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if !result.Success {
			t.Fatalf("Parsing failed: %s", result.Error)
		}

		if result.Fields["device_id"] != "device00" {
			t.Errorf("Expected device_id='device00', got '%v'", result.Fields["device_id"])
		}
		if result.Fields["status"] != uint8(1) {
			t.Errorf("Expected status=1, got %v", result.Fields["status"])
		}
	})

	// Test case 3: Message with checksum validation
	t.Run("Message with checksum validation", func(t *testing.T) {
		format := models.MessageFormat{
			Body: []models.FieldDefinition{
				{Name: "data1", Type: "uint8", Offset: 0, Length: 1},
				{Name: "data2", Type: "uint8", Offset: 1, Length: 1},
			},
			Checksum: &models.FieldDefinition{
				Name:   "checksum",
				Type:   "uint8",
				Offset: 2,
				Length: 1,
			},
			Encoding: "hex",
		}

		formatJSON, _ := json.Marshal(format)
		// data1=10, data2=20, checksum=30 (10+20)
		rawData := "0a141e"

		result, err := parseMessageData(string(formatJSON), rawData)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if !result.Success {
			t.Fatalf("Parsing failed: %s", result.Error)
		}

		if result.Fields["data1"] != uint8(10) {
			t.Errorf("Expected data1=10, got %v", result.Fields["data1"])
		}
		if result.Fields["data2"] != uint8(20) {
			t.Errorf("Expected data2=20, got %v", result.Fields["data2"])
		}
		if result.Fields["checksum"] != uint8(30) {
			t.Errorf("Expected checksum=30, got %v", result.Fields["checksum"])
		}
	})

	// Test case 4: Invalid encoding
	t.Run("Invalid encoding type", func(t *testing.T) {
		format := models.MessageFormat{
			Encoding: "invalid",
		}

		formatJSON, _ := json.Marshal(format)
		rawData := "test"

		result, err := parseMessageData(string(formatJSON), rawData)
		if err != nil {
			t.Fatalf("Unexpected error: %v", err)
		}

		if result.Success {
			t.Error("Expected parsing to fail with invalid encoding")
		}
	})

	// Test case 5: Insufficient data
	t.Run("Insufficient data", func(t *testing.T) {
		format := models.MessageFormat{
			Body: []models.FieldDefinition{
				{Name: "data", Type: "uint16", Offset: 0, Length: 2},
			},
			Encoding: "hex",
		}

		formatJSON, _ := json.Marshal(format)
		rawData := "01" // Only 1 byte, but need 2 bytes

		_, err := parseMessageData(string(formatJSON), rawData)
		if err == nil {
			t.Error("Expected error with insufficient data, but got none")
		}
	})
}

func TestParseField(t *testing.T) {
	testData := []byte{0x01, 0x02, 0x00, 0x64, 0x80, 0x00, 0x40, 0x00, 0x74, 0x65, 0x73, 0x74, 0x00}

	tests := []struct {
		name     string
		field    models.FieldDefinition
		expected interface{}
	}{
		{
			name:     "uint8",
			field:    models.FieldDefinition{Type: "uint8", Offset: 0, Length: 1},
			expected: uint8(1),
		},
		{
			name:     "int8 signed",
			field:    models.FieldDefinition{Type: "int8", Offset: 4, Length: 1, Signed: true},
			expected: int8(-128),
		},
		{
			name:     "uint16 big endian",
			field:    models.FieldDefinition{Type: "uint16", Offset: 1, Length: 2, Endian: "big"},
			expected: uint16(512),
		},
		{
			name:     "int32 little endian",
			field:    models.FieldDefinition{Type: "int32", Offset: 4, Length: 4, Endian: "little", Signed: true},
			expected: int32(4194432),
		},
		{
			name:     "string with null termination",
			field:    models.FieldDefinition{Type: "string", Offset: 8, Length: 5},
			expected: "test",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, _, err := parseField(testData, tt.field.Offset, tt.field)
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}

			if result != tt.expected {
				t.Errorf("Expected %v, got %v", tt.expected, result)
			}
		})
	}
}

func TestValidateChecksum(t *testing.T) {
	testData := []byte{0x01, 0x02, 0x03}

	tests := []struct {
		name           string
		checksumField  models.FieldDefinition
		checksumValue  interface{}
		expectedResult bool
	}{
		{
			name:           "Valid uint8 checksum",
			checksumField:  models.FieldDefinition{Type: "uint8"},
			checksumValue:  uint8(6), // 1+2+3
			expectedResult: true,
		},
		{
			name:           "Invalid uint8 checksum",
			checksumField:  models.FieldDefinition{Type: "uint8"},
			checksumValue:  uint8(5),
			expectedResult: false,
		},
		{
			name:           "Valid uint16 checksum",
			checksumField:  models.FieldDefinition{Type: "uint16"},
			checksumValue:  uint16(6), // 1+2+3
			expectedResult: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := validateChecksum(testData, len(testData), tt.checksumField, tt.checksumValue)
			if result != tt.expectedResult {
				t.Errorf("Expected %v, got %v", tt.expectedResult, result)
			}
		})
	}
}
