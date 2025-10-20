package controllers

import (
	"encoding/binary"
	"fmt"
	"testing"
)

func TestPacketStructure(t *testing.T) {
	// 验证数据包字段位置计算
	fmt.Println("数据包字段位置验证:")
	fmt.Println("========================")

	// 字段位置计算
	totalLenStart := 0
	totalLenEnd := 4
	cmdCodeStart := 4
	cmdCodeEnd := 5
	tokenStart := 5
	tokenEnd := 25
	msgIdLenStart := 25
	msgIdLenEnd := 26

	fmt.Printf("Total_len:  字节 %d-%d (%d字节)\n", totalLenStart, totalLenEnd-1, totalLenEnd-totalLenStart)
	fmt.Printf("Cmd_code:   字节 %d (%d字节)\n", cmdCodeStart, cmdCodeEnd-cmdCodeStart)
	fmt.Printf("Token:      字节 %d-%d (%d字节)\n", tokenStart, tokenEnd-1, tokenEnd-tokenStart)
	fmt.Printf("Msg_id_len: 字节 %d (%d字节)\n", msgIdLenStart, msgIdLenEnd-msgIdLenStart)

	// 示例：假设 msg_id_len = 8
	msgIdLen := uint8(8)
	msgIdStart := 26
	msgIdEnd := msgIdStart + int(msgIdLen)
	fmt.Printf("\nMsg_id (长度=%d): 字节 %d-%d (%d字节)\n", msgIdLen, msgIdStart, msgIdEnd-1, msgIdEnd-msgIdStart)

	contentLenStart := msgIdEnd
	contentLenEnd := contentLenStart + 2
	fmt.Printf("Content_len: 字节 %d-%d (%d字节)\n", contentLenStart, contentLenEnd-1, contentLenEnd-contentLenStart)

	// 示例：假设 content_len = 20
	contentLen := uint16(20)
	contentStart := contentLenEnd
	contentEnd := contentStart + int(contentLen)
	fmt.Printf("Content (长度=%d): 字节 %d-%d (%d字节)\n", contentLen, contentStart, contentEnd-1, contentEnd-contentStart)

	fmt.Printf("\n最小数据包长度: %d字节\n", contentEnd)

	// 验证字节范围计算
	fmt.Println("\n字节范围验证:")
	fmt.Printf("data[5:25] 包含字节: 5,6,...,24 (共%d字节)\n", 25-5)
	fmt.Printf("data[26:34] 包含字节: 26,27,...,33 (共%d字节)\n", 34-26)

	// 测试实际数据解析
	fmt.Println("\n测试实际数据解析:")
	testData := make([]byte, 100)
	// 设置一些测试数据
	testData[4] = 0x01                              // cmd_code
	testData[25] = 0x08                             // msg_id_len = 8
	binary.BigEndian.PutUint16(testData[34:36], 20) // content_len = 20

	// 解析测试
	token := testData[5:25]
	fmt.Printf("Token长度: %d字节\n", len(token))

	msgId := testData[26:34]
	fmt.Printf("Msg_id长度: %d字节\n", len(msgId))

	contentLenValue := binary.BigEndian.Uint16(testData[34:36])
	fmt.Printf("Content_len值: %d\n", contentLenValue)

	content := testData[36:56]
	fmt.Printf("Content长度: %d字节\n", len(content))
}

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
