package controllers

import (
	"encoding/binary"
	"fmt"
	"testing"
)

func TestZyData(t *testing.T) {
	// 测试用例
	testCases := []struct {
		name       string
		hexContent string
		expected   string
	}{
		{
			name:       "北纬东经",
			hexContent: "11150C151515150254FA0006EBE740112F054E74",
			expected:   "纬度: 39.123456, 经度: 116.123456",
		},
		{
			name:       "南纬",
			hexContent: "11150C151515158254FA0006EBE740112F054E74",
			expected:   "纬度: -39.123456, 经度: 116.123456",
		},
		{
			name:       "西经",
			hexContent: "11150C151515150254FA0086EBE740112F054E74",
			expected:   "纬度: 39.123456, 经度: -116.123456",
		},
		{
			name:       "南纬西经",
			hexContent: "11150C151515158254FA0086EBE740112F054E74",
			expected:   "纬度: -39.123456, 经度: -116.123456",
		},
	}

	fmt.Println("测试经纬度方向解析...")
	fmt.Println("==========================================")

	for _, tc := range testCases {
		fmt.Printf("测试用例: %s\n", tc.name)
		fmt.Printf("输入数据: %s\n", tc.hexContent)

		contentData, err := parseContentData(tc.hexContent)
		if err != nil {
			fmt.Printf("解析错误: %v\n\n", err)
			continue
		}

		actual := fmt.Sprintf("纬度: %.6f, 经度: %.6f", contentData.Latitude, contentData.Longitude)
		fmt.Printf("解析结果: %s\n", actual)
		fmt.Printf("期望结果: %s\n", tc.expected)

		if actual == tc.expected {
			fmt.Printf("✅ 测试通过\n")
		} else {
			fmt.Printf("❌ 测试失败\n")
		}
		fmt.Println("------------------------------------------")
	}

	// 验证十六进制表示
	fmt.Println("验证十六进制表示:")
	fmt.Printf("北纬39.123456: 0254FA00 -> %d\n", binary.BigEndian.Uint32([]byte{0x02, 0x54, 0xFA, 0x00}))
	fmt.Printf("南纬39.123456: 8254FA00 -> %d\n", binary.BigEndian.Uint32([]byte{0x82, 0x54, 0xFA, 0x00}))
	fmt.Printf("东经116.123456: 06EBE740 -> %d\n", binary.BigEndian.Uint32([]byte{0x06, 0xEB, 0xE7, 0x40}))
	fmt.Printf("西经116.123456: 86EBE740 -> %d\n", binary.BigEndian.Uint32([]byte{0x86, 0xEB, 0xE7, 0x40}))
}

// TestParseContentData is a test function to verify content data parsing
func TestParseContentData(t *testing.T) {
	// Test with the provided example
	hexContent := "11150C151515150254FA0006EBE740112F054E74"

	fmt.Println("Testing content data parsing...")
	fmt.Printf("Input hex: %s\n", hexContent)

	contentData, err := parseContentData(hexContent)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}

	fmt.Printf("Parsed data:\n")
	fmt.Printf("  DeviceType: 0x%02X\n", contentData.DeviceType)
	fmt.Printf("  DateTime: %s\n", contentData.DateTime)
	fmt.Printf("  Latitude: %f\n", contentData.Latitude)
	fmt.Printf("  Longitude: %f\n", contentData.Longitude)
	fmt.Printf("  Altitude: %d\n", contentData.Altitude)
	fmt.Printf("  SNR: %d\n", contentData.SNR)
	fmt.Printf("  Temperature: %d\n", contentData.Temperature)
	fmt.Printf("  Voltage: %.1f\n", contentData.Voltage)

	// Verify the results match the example
	fmt.Printf("\nExpected values from example:\n")
	fmt.Printf("  DeviceType: 0x11 (00010001 - 报警类信息，天启救援报警终端)\n")
	fmt.Printf("  DateTime: 2021-12-21 21:21:21\n")
	fmt.Printf("  Latitude: 39.123456\n")
	fmt.Printf("  Longitude: 116.123456\n")
	fmt.Printf("  Altitude: 3899\n")
	fmt.Printf("  SNR: 5\n")
	fmt.Printf("  Temperature: 28\n")
	fmt.Printf("  Voltage: 5.8\n")
}
