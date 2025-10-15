<script>
    import { onMount } from "svelte";
    import MapboxComponent from "../components/map/MapboxComponent.svelte";

    export let devices = [];
    export const onRefresh = () => {};

    let selectedDevice = null;
    let dialogOpen = false;
    let alertOpen = false;
    let alertMessage = "";
    let mapComponent;
    let navigationCompleteOpen = false;
    let isNavigating = false;

    function handleMarkerClick(device) {
        selectedDevice = device;
        dialogOpen = true;
    }

    function handleCloseDialog() {
        dialogOpen = false;
        selectedDevice = null;
    }

    function handleGeofenceViolation(violation) {
        alertMessage = violation.message;
        alertOpen = true;

        // 警报显示5秒后自动关闭
        setTimeout(() => {
            alertOpen = false;
        }, 5000);
    }

    function handleCloseAlert() {
        alertOpen = false;
    }

    function showNavigationError(deviceName) {
        alertMessage = `导航到设备 "${deviceName}" 失败，请检查网络连接或位置权限`;
        alertOpen = true;

        // 提示显示5秒后自动关闭
        setTimeout(() => {
            alertOpen = false;
        }, 3000);
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

    function navigateToDevice() {
        if (
            selectedDevice &&
            selectedDevice.longitude &&
            selectedDevice.latitude &&
            mapComponent
        ) {
            mapComponent.navigateToDevice(selectedDevice);

            // 2秒后关闭对话框
            setTimeout(() => {
                handleCloseDialog();
            }, 2000);
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
                showNavigationError(selectedDevice?.name || "设备");
                console.error("导航错误:", errorMessage);
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
                                        on:click={() =>
                                            console.log("查看历史轨迹")}
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
        <div class="alert-snackbar">
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

    .nav-icon {
        font-size: 14px;
        margin-right: 6px;
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

    .history-icon {
        font-size: 13px;
    }

    .alert-snackbar {
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #f44336;
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 1001;
        max-width: 90%;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .alert-snackbar button {
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
</style>
