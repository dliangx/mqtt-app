// 坐标验证测试工具
// 用于测试和调试设备坐标数据格式问题

/**
 * 验证坐标是否有效
 * @param {any} value - 坐标值
 * @returns {boolean} 是否有效
 */
export const isValidCoordinate = (value) => {
  if (value == null) return false;
  const num = parseFloat(value);
  return !isNaN(num) && isFinite(num) && typeof num === 'number';
};

/**
 * 验证经度是否有效
 * @param {any} lng - 经度值
 * @returns {boolean} 是否有效
 */
export const isValidLongitude = (lng) =>
  isValidCoordinate(lng) && lng >= -180 && lng <= 180;

/**
 * 验证纬度是否有效
 * @param {any} lat - 纬度值
 * @returns {boolean} 是否有效
 */
export const isValidLatitude = (lat) =>
  isValidCoordinate(lat) && lat >= -90 && lat <= 90;

/**
 * 调试坐标信息
 * @param {any} longitude - 经度值
 * @param {any} latitude - 纬度值
 * @param {string} deviceName - 设备名称（可选）
 * @returns {object} 调试信息
 */
export const debugCoordinate = (longitude, latitude, deviceName = 'unknown') => {
  const lng = parseFloat(longitude);
  const lat = parseFloat(latitude);

  return {
    device: deviceName,
    originalLng: longitude,
    originalLat: latitude,
    typeLng: typeof longitude,
    typeLat: typeof latitude,
    parsedLng: lng,
    parsedLat: lat,
    isLngValid: isValidLongitude(longitude),
    isLatValid: isValidLatitude(latitude),
    isLngNaN: isNaN(lng),
    isLatNaN: isNaN(lat),
    isLngFinite: isFinite(lng),
    isLatFinite: isFinite(lat),
    isValid: isValidLongitude(longitude) && isValidLatitude(latitude)
  };
};

/**
 * 测试各种坐标格式
 */
export const testCoordinateFormats = () => {
  const testCases = [
    { lng: 116.397428, lat: 39.90923, desc: '正常坐标' },
    { lng: '116.397428', lat: '39.90923', desc: '字符串坐标' },
    { lng: null, lat: null, desc: 'null坐标' },
    { lng: undefined, lat: undefined, desc: 'undefined坐标' },
    { lng: NaN, lat: NaN, desc: 'NaN坐标' },
    { lng: Infinity, lat: -Infinity, desc: '无限值坐标' },
    { lng: 0, lat: 0, desc: '零值坐标' },
    { lng: 200, lat: 100, desc: '超出范围坐标' },
    { lng: -200, lat: -100, desc: '负超出范围坐标' },
    { lng: 'invalid', lat: 'invalid', desc: '无效字符串坐标' },
    { lng: {}, lat: [], desc: '对象坐标' }
  ];

  console.log('=== 坐标验证测试 ===');
  testCases.forEach((testCase, index) => {
    const debugInfo = debugCoordinate(testCase.lng, testCase.lat, `测试${index + 1}`);
    console.log(`测试 ${index + 1}: ${testCase.desc}`, debugInfo);
  });
};

/**
 * 验证设备数据中的坐标
 * @param {Array} devices - 设备数组
 * @returns {object} 验证结果
 */
export const validateDeviceCoordinates = (devices) => {
  if (!Array.isArray(devices)) {
    console.error('设备数据不是数组');
    return { valid: false, invalidDevices: [], validDevices: [] };
  }

  const validDevices = [];
  const invalidDevices = [];

  devices.forEach((device) => {
    const isValid = isValidLongitude(device.longitude) && isValidLatitude(device.latitude);
    const debugInfo = debugCoordinate(device.longitude, device.latitude, device.name);

    if (isValid) {
      validDevices.push({ device, debugInfo });
    } else {
      invalidDevices.push({ device, debugInfo });
    }
  });

  console.log('=== 设备坐标验证结果 ===');
  console.log(`总设备数: ${devices.length}`);
  console.log(`有效设备: ${validDevices.length}`);
  console.log(`无效设备: ${invalidDevices.length}`);

  if (invalidDevices.length > 0) {
    console.log('无效设备详情:');
    invalidDevices.forEach((item, index) => {
      console.log(`无效设备 ${index + 1}:`, item.device.name, item.debugInfo);
    });
  }

  return {
    valid: invalidDevices.length === 0,
    validDevices,
    invalidDevices
  };
};

// 默认导出
export default {
  isValidCoordinate,
  isValidLongitude,
  isValidLatitude,
  debugCoordinate,
  testCoordinateFormats,
  validateDeviceCoordinates
};
