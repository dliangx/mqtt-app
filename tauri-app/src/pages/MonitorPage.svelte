<script>
    import { onMount } from "svelte";
    import MapboxComponent from "../components/map/MapboxComponent.svelte";

    export let devices = [];
    export let alerts = [];
    export const onRefresh = () => {};

    let selectedDevice = null;
    let dialogOpen = false;
    let alertOpen = false;
    let alertMessage = "";
    let alertType = "info"; // info, success, warning, error
    let mapComponent;
    let navigationCompleteOpen = false;
    let isNavigating = false;
    let isShowingHistory = false;
    let currentPlatform = "unknown";
    let currentLocation = null;

    function handleMarkerClick(device) {
        selectedDevice = device;
        dialogOpen = true;
    }

    function handleCloseDialog() {
        dialogOpen = false;
        selectedDevice = null;
        // 不自动清除历史轨迹，让用户继续看到轨迹
    }

    function handleGeofenceViolation(violation) {
        alertMessage = violation.message;
        alertType = "warning";
        alertOpen = true;

        // 警报显示5秒后自动关闭
        setTimeout(() => {
            alertOpen = false;
        }, 5000);
    }

    function handleCloseAlert() {
        alertOpen = false;
    }

    function showAlert(message, type = "info") {
        alertMessage = message;
        alertType = type;
        alertOpen = true;

        // 提示显示5秒后自动关闭
        setTimeout(() => {
            alertOpen = false;
        }, 5000);
    }

    function showNavigationError(deviceName, errorMessage = "") {
        alertMessage = `导航到设备 "${deviceName}" 失败，请稍后重试`;
        alertType = "warning";
        alertOpen = true;

        // 提示显示5秒后自动关闭
        setTimeout(() => {
            alertOpen = false;
        }, 5000);
    }

    function getStatusColor(status) {
        switch (status) {
            case "online":
                return "#4caf50";
            case "offline":
                return "#f44336";
            case "warning":
                return "#ff9800";
            default:
                return "#757575";
        }
    }

    function getStatusText(status) {
        switch (status) {
            case "online":
                return "在线";
            case "offline":
                return "离线";
            case "warning":
                return "警告";
            default:
                return status;
        }
    }

    // 检测平台类型
    async function detectPlatform() {
        try {
            // 检查是否在Tauri环境中
            if (window.__TAURI__) {
                try {
                    // 尝试使用Tauri OS插件
                    const osModule = await import("@tauri-apps/plugin-os");
                    const osPlatform = await osModule.platform();
                    currentPlatform = osPlatform;
                    console.log("Tauri平台检测成功:", currentPlatform);
                    return;
                } catch (error) {
                    console.warn("Tauri OS插件检测失败:", error.message);
                    // 继续尝试其他方法
                }
            }

            // 回退到用户代理检测
            console.log("使用用户代理检测平台");
            const userAgent = navigator.userAgent.toLowerCase();
            if (userAgent.includes("windows")) {
                currentPlatform = "windows";
            } else if (userAgent.includes("mac")) {
                currentPlatform = "macos";
            } else if (
                userAgent.includes("iphone") ||
                userAgent.includes("ipad")
            ) {
                currentPlatform = "ios";
            } else if (userAgent.includes("android")) {
                currentPlatform = "android";
            } else {
                currentPlatform = "unknown";
            }
            console.log("用户代理检测结果:", currentPlatform);
        } catch (error) {
            console.error("平台检测完全失败:", error);
            currentPlatform = "unknown";
        }
    }

    // 获取当前位置
    async function getCurrentLocation() {
        try {
            // 首先检查网络连接
            if (!navigator.onLine) {
                throw new Error("设备未连接到互联网，无法进行定位");
            }

            // 根据平台选择定位策略
            if (currentPlatform === "ios" || currentPlatform === "android") {
                // 移动设备：优先使用Tauri GPS定位
                if (window.__TAURI__) {
                    try {
                        // 动态导入Tauri地理定位插件
                        const geolocationModule = await import(
                            "@tauri-apps/plugin-geolocation"
                        );

                        // 检查位置权限
                        let permissions =
                            await geolocationModule.checkPermissions();

                        // 如果需要权限，请求权限
                        if (
                            permissions.location === "prompt" ||
                            permissions.location === "prompt-with-rationale"
                        ) {
                            permissions =
                                await geolocationModule.requestPermissions([
                                    "location",
                                ]);
                        }

                        // 如果权限被授予，获取位置
                        if (permissions.location === "granted") {
                            const position =
                                await geolocationModule.getCurrentPosition();
                            const location = {
                                longitude: position.coords.longitude,
                                latitude: position.coords.latitude,
                                accuracy: position.coords.accuracy,
                                source: "tauri-geolocation",
                            };
                            console.log("使用Tauri GPS定位成功");
                            return location;
                        } else {
                            console.warn("Tauri GPS定位权限被拒绝");
                            throw new Error("位置权限被拒绝");
                        }
                    } catch (tauriError) {
                        console.warn("Tauri GPS定位失败:", tauriError.message);
                        // Tauri定位失败，回退到浏览器定位
                        return await getBrowserLocationWithFallback();
                    }
                } else {
                    // 非Tauri环境的移动设备，使用浏览器定位
                    return await getBrowserLocationWithFallback();
                }
            } else {
                // 桌面设备：使用浏览器定位
                return await getBrowserLocationWithFallback();
            }
        } catch (error) {
            console.error("所有定位方案都失败了:", error);
            console.error("平台信息:", currentPlatform);
            console.error("用户代理:", navigator.userAgent);
            showAlert("无法获取当前位置，请检查网络连接或位置权限", "error");
            return null;
        }
    }

    // 浏览器定位带备用方案
    async function getBrowserLocationWithFallback() {
        try {
            const location = await getBrowserLocation();
            console.log("使用浏览器定位成功");
            return location;
        } catch (browserError) {
            console.warn("浏览器定位失败:", browserError);

            // 如果是权限被拒绝，直接使用IP定位
            if (
                browserError.message.includes("denied") ||
                browserError.code === 1
            ) {
                console.log("位置权限被拒绝，使用IP定位");
                return await getIPLocation();
            }

            // 其他错误也回退到IP定位
            console.log("浏览器定位失败，使用IP定位");
            return await getIPLocation();
        }
    }

    // 浏览器定位
    async function getBrowserLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("浏览器不支持地理位置服务"));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = {
                        longitude: position.coords.longitude,
                        latitude: position.coords.latitude,
                        accuracy: position.coords.accuracy,
                        source: "browser",
                    };
                    currentLocation = location;
                    resolve(location);
                },
                (error) => {
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000,
                },
            );
        });
    }

    // IP定位
    async function getIPLocation() {
        // 检查网络连接
        if (!navigator.onLine) {
            throw new Error("设备未连接到互联网，无法进行IP定位");
        }

        // 多个IP定位服务，按优先级尝试
        const ipServices = [
            {
                url: "https://ipapi.co/json/",
                parse: (data) => ({
                    longitude: data.longitude,
                    latitude: data.latitude,
                    city: data.city,
                    country: data.country_name,
                }),
            },
            {
                url: "https://ipinfo.io/json",
                parse: (data) => {
                    const [lat, lon] = data.loc.split(",");
                    return {
                        longitude: parseFloat(lon),
                        latitude: parseFloat(lat),
                        city: data.city,
                        country: data.country,
                    };
                },
            },
            {
                url: "https://api.ip.sb/geoip",
                parse: (data) => ({
                    longitude: data.longitude,
                    latitude: data.latitude,
                    city: data.city,
                    country: data.country,
                }),
            },
            {
                url: "https://api.ipgeolocation.io/ipgeo?apiKey=demo",
                parse: (data) => ({
                    longitude: parseFloat(data.longitude),
                    latitude: parseFloat(data.latitude),
                    city: data.city,
                    country: data.country_name,
                }),
            },
        ];

        for (const service of ipServices) {
            try {
                console.log(`尝试IP定位服务: ${service.url}`);
                const response = await fetch(service.url, {
                    signal: AbortSignal.timeout(5000), // 5秒超时
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                const locationData = service.parse(data);

                // 验证坐标是否有效
                if (
                    locationData.longitude &&
                    locationData.latitude &&
                    Math.abs(locationData.latitude) <= 90 &&
                    Math.abs(locationData.longitude) <= 180
                ) {
                    const location = {
                        ...locationData,
                        source: "ip",
                        service: service.url,
                    };
                    currentLocation = location;
                    console.log(`IP定位成功: ${service.url}`);
                    return location;
                } else {
                    throw new Error("无效的坐标数据");
                }
            } catch (error) {
                console.warn(`IP定位服务 ${service.url} 失败:`, error);
                // 继续尝试下一个服务
            }
        }

        // 所有服务都失败
        console.error(
            "所有IP定位服务都失败了，最后尝试的服务:",
            ipServices[ipServices.length - 1].url,
        );
        console.error("网络状态检查:", {
            online: navigator.onLine,
            userAgent: navigator.userAgent,
        });
        throw new Error("所有IP定位服务都无法获取位置信息，请检查网络连接");
    }

    // 测试定位功能
    async function testLocationServices() {
        console.log("=== 开始定位服务测试 ===");
        console.log("平台信息:", currentPlatform);
        console.log("网络状态:", navigator.onLine);
        console.log("用户代理:", navigator.userAgent);

        try {
            // 测试浏览器定位
            console.log("测试浏览器定位...");
            try {
                const browserLocation = await getBrowserLocation();
                console.log("✅ 浏览器定位成功:", browserLocation);
            } catch (error) {
                console.log("❌ 浏览器定位失败:", error.message);
            }

            // 测试IP定位
            console.log("测试IP定位...");
            try {
                const ipLocation = await getIPLocation();
                console.log("✅ IP定位成功:", ipLocation);
            } catch (error) {
                console.log("❌ IP定位失败:", error.message);
            }

            // 测试Tauri定位（仅移动设备且在Tauri环境中）
            if (
                (currentPlatform === "ios" || currentPlatform === "android") &&
                window.__TAURI__
            ) {
                console.log("测试Tauri定位...");
                try {
                    const geolocationModule = await import(
                        "@tauri-apps/plugin-geolocation"
                    );
                    const position =
                        await geolocationModule.getCurrentPosition();
                    const location = {
                        longitude: position.coords.longitude,
                        latitude: position.coords.latitude,
                        accuracy: position.coords.accuracy,
                        source: "tauri-geolocation",
                    };
                    console.log("✅ Tauri定位成功:", location);
                } catch (error) {
                    console.log("❌ Tauri定位失败:", error.message);
                }
            } else if (
                currentPlatform === "ios" ||
                currentPlatform === "android"
            ) {
                console.log("跳过Tauri定位测试：非Tauri环境");
            }

            console.log("=== 定位服务测试完成 ===");
        } catch (error) {
            console.error("定位测试过程中出错:", error);
        }
    }

    async function navigateToDevice() {
        if (
            selectedDevice &&
            selectedDevice.longitude &&
            selectedDevice.latitude &&
            mapComponent
        ) {
            isNavigating = true;

            try {
                // 首先检测平台
                await detectPlatform();

                // 获取当前位置
                const location = await getCurrentLocation();

                if (location) {
                    console.log(
                        `使用${location.source}定位，平台: ${currentPlatform}`,
                    );

                    // 更新地图组件的当前位置
                    if (mapComponent.currentLocation) {
                        mapComponent.currentLocation = location;
                    }

                    // 开始导航
                    mapComponent.navigateToDevice(selectedDevice);

                    // 导航开始后立即关闭对话框，让用户看到地图上的导航过程
                    handleCloseDialog();
                } else {
                    showAlert("无法获取当前位置，导航失败", "error");
                }
            } catch (error) {
                console.error("导航准备失败:", error);
                showNavigationError(selectedDevice.name, error.message);
            } finally {
                isNavigating = false;
            }
        }
    }

    function showHistoryTrail() {
        if (!selectedDevice || !mapComponent) return;

        // 查找该设备的历史轨迹数据
        const deviceAlerts = alerts.filter(
            (alert) =>
                alert.device_id === selectedDevice.ID &&
                alert.type === "1" &&
                alert.parsed_data,
        );

        if (deviceAlerts.length === 0) {
            alertMessage = "该设备暂无历史轨迹数据";
            alertType = "warning";
            alertOpen = true;
            setTimeout(() => {
                alertOpen = false;
            }, 3000);
            return;
        }

        // 提取经纬度坐标
        const coordinates = deviceAlerts
            .map((alert) => {
                const data = JSON.parse(alert.parsed_data);
                return [data.longitude, data.latitude];
            })
            .filter((coord) => coord[0] && coord[1]); // 过滤无效坐标

        if (coordinates.length < 2) {
            alertMessage = "历史轨迹数据不足，无法显示轨迹";
            alertType = "info";
            alertOpen = true;
            setTimeout(() => {
                alertOpen = false;
            }, 3000);
            return;
        }

        // 显示历史轨迹
        mapComponent.showHistoryTrack(coordinates);
        isShowingHistory = true;

        // 立即关闭对话框，轨迹会继续显示
        handleCloseDialog();
    }

    function clearHistoryTrail() {
        if (mapComponent) {
            mapComponent.clearHistoryTrack();
            isShowingHistory = false;
        }
    }

    function handleOverlayKeyDown(event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleCloseDialog();
        }
    }

    function handleDialogKeyDown(event) {
        if (event.key === "Escape") {
            handleCloseDialog();
        }
    }

    onMount(() => {
        // Map component will be initialized here
    });

    // 组件销毁时清理历史轨迹
    $: {
        if (!dialogOpen && isShowingHistory) {
            // 不自动清除，让用户继续看到轨迹
        }
    }
    // 组件挂载时检测平台
    $: {
        detectPlatform();
    }
</script>

<div class="monitor-page">
    <!-- Map component with geofence and navigation features -->
    <div class="map-container">
        <MapboxComponent
            bind:this={mapComponent}
            {devices}
            onMarkerClick={handleMarkerClick}
            onGeofenceViolation={handleGeofenceViolation}
            onNavigationStart={() => {
                isNavigating = true;
            }}
            onNavigationEnd={() => {
                isNavigating = false;
            }}
            onNavigationError={(errorMessage) => {
                isNavigating = false;
                showNavigationError(
                    selectedDevice?.name || "设备",
                    errorMessage,
                );
            }}
            height="100%"
        />
    </div>

    <!-- Device Info Dialog -->
    {#if dialogOpen}
        <div
            class="dialog-overlay"
            role="button"
            tabindex="0"
            aria-label="关闭对话框"
        >
            <div
                class="dialog"
                role="dialog"
                aria-labelledby="dialog-title"
                aria-modal="true"
            >
                <div class="dialog-header" role="button" tabindex="0">
                    <h3 id="dialog-title">
                        设备信息 - {selectedDevice?.name || "未知设备"}
                    </h3>
                    <button
                        class="close-btn"
                        on:click={handleCloseDialog}
                        aria-label="关闭对话框">×</button
                    >
                </div>

                <div class="dialog-content">
                    {#if selectedDevice}
                        <div class="device-info">
                            <div class="device-header">
                                <h4>{selectedDevice.name}</h4>
                                <span
                                    class="status-badge"
                                    style="background-color: {getStatusColor(
                                        selectedDevice.status,
                                    )}"
                                >
                                    {getStatusText(selectedDevice.status)}
                                </span>
                            </div>

                            <div class="info-section">
                                <span class="info-label">Topic</span>
                                <p>{selectedDevice.topic || "未设置"}</p>
                            </div>

                            {#if selectedDevice.longitude && selectedDevice.latitude}
                                <div class="info-section">
                                    <span class="info-label">位置坐标</span>
                                    <p>
                                        {Number(
                                            selectedDevice.longitude,
                                        ).toFixed(6)},
                                        {Number(
                                            selectedDevice.latitude,
                                        ).toFixed(6)}
                                    </p>
                                </div>
                            {/if}

                            {#if selectedDevice.address}
                                <div class="info-section">
                                    <span class="info-label">地址</span>
                                    <p>{selectedDevice.address}</p>
                                </div>
                            {/if}

                            {#if currentLocation}
                                <div class="info-section">
                                    <span class="info-label">当前位置来源</span>
                                    <p>
                                        {currentLocation.source === "browser"
                                            ? "浏览器定位"
                                            : currentLocation.source === "ip"
                                              ? "IP定位"
                                              : currentLocation.source ===
                                                  "tauri-geolocation"
                                                ? "设备GPS定位"
                                                : currentLocation.source}
                                        {currentLocation.city
                                            ? ` (${currentLocation.city})`
                                            : ""}
                                        {currentLocation.service
                                            ? ` - ${new URL(currentLocation.service).hostname}`
                                            : ""}
                                    </p>
                                </div>
                            {/if}

                            <div class="actions">
                                <div class="button-group">
                                    <button
                                        class="nav-btn {isNavigating
                                            ? 'navigating'
                                            : ''}"
                                        on:click={navigateToDevice}
                                        disabled={!selectedDevice.longitude ||
                                            !selectedDevice.latitude ||
                                            isNavigating}
                                    >
                                        {#if isNavigating}
                                            <div class="nav-loading">
                                                <div class="nav-spinner"></div>
                                                正在计算路线...
                                            </div>
                                        {:else}
                                            开始导航
                                        {/if}
                                    </button>
                                    <button
                                        class="history-btn"
                                        on:click={showHistoryTrail}
                                    >
                                        查看历史轨迹
                                    </button>
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    {/if}

    <!-- Alert Snackbar -->
    {#if alertOpen}
        <div class="alert-snackbar {alertType}">
            <span>{alertMessage}</span>
            <button on:click={handleCloseAlert} aria-label="关闭警报">×</button>
        </div>
    {/if}
</div>

<style>
    .monitor-page {
        height: 100vh;
        width: 100vw;
        position: fixed;
        top: 0;
        left: 0;
        padding: 0;
        margin: 0;
    }

    .map-container {
        height: 100%;
        width: 100%;
        position: relative;
    }

    .dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        cursor: pointer;
    }

    .dialog {
        background: white;
        border-radius: 12px;
        max-width: 400px;
        width: 90%;
        max-height: 80vh;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        cursor: default;
    }

    .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px 16px;
        border-bottom: 1px solid #e0e0e0;
        cursor: pointer;
        transition: background-color 0.2s ease;
    }

    .dialog-header:hover {
        background-color: #f5f5f5;
    }

    .dialog-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
    }

    .close-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .close-btn:hover {
        color: #333;
    }

    .dialog-content {
        padding: 24px;
        max-height: 60vh;
        overflow-y: auto;
    }

    .device-info {
        margin-top: 8px;
    }

    .device-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
    }

    .device-header h4 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
    }

    .status-badge {
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
    }

    .info-section {
        margin-bottom: 16px;
    }

    .info-label {
        display: block;
        font-size: 12px;
        color: #666;
        margin-bottom: 4px;
        font-weight: 500;
    }

    .info-section p {
        margin: 0;
        font-size: 14px;
        color: #333;
    }

    .actions {
        margin-top: 20px;
    }

    .button-group {
        display: flex;
        gap: 16px;
        width: 100%;
        justify-content: space-between;
    }

    .button-group > button {
        flex: 0 1 auto;
        min-width: 120px;
        padding: 8px 12px;
        font-size: 13px;
    }

    .nav-btn {
        background: white;
        border: 1px solid #1976d2;
        color: #1976d2;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
    }

    .nav-btn:hover:not(:disabled) {
        background-color: #1976d2;
        color: white;
        transform: translateY(-1px);
        box-shadow: 0 2px 6px rgba(25, 118, 210, 0.2);
    }

    .nav-btn.navigating {
        background-color: #f5f5f5;
        border-color: #ccc;
        color: #999;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
    }

    .nav-loading {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .nav-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top: 2px solid white;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }

    .nav-btn:disabled {
        background-color: #f5f5f5;
        border-color: #ddd;
        color: #ccc;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
    }

    .history-btn {
        background: white;
        border: 1px solid #1976d2;
        color: #1976d2;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
    }

    .history-btn:hover {
        background-color: #1976d2;
        color: white;
        transform: translateY(-1px);
        box-shadow: 0 2px 6px rgba(25, 118, 210, 0.2);
    }

    .alert-snackbar {
        position: fixed;
        top: 100px;
        left: 50%;
        transform: translateX(-50%);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 1001;
        max-width: 400px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        animation: slideDown 0.3s ease-out;
    }

    .alert-snackbar.success {
        background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
    }

    .alert-snackbar.warning {
        background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
    }

    .alert-snackbar.error {
        background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
    }

    .alert-snackbar.info {
        background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
    }

    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }

    .alert-icon {
        font-size: 18px;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .alert-snackbar button {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        font-size: 16px;
        cursor: pointer;
        padding: 4px;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s ease;
        flex-shrink: 0;
    }

    .alert-snackbar button:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(1.1);
    }

    .alert-snackbar span {
        font-size: 14px;
        font-weight: 500;
        line-height: 1.4;
        flex: 1;
    }
</style>
