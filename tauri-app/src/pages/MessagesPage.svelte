<script>
    import { onMount } from "svelte";
    import { apiService } from "../services/api";

    export let alerts = [];
    export let devices = [];
    export const unreadCount = 0;
    export let loading = false;
    export let onMarkAsRead = () => {};
    export const onRefresh = () => {};

    let testMode = false;
    let testAlerts = [];
    let selectedAlert = null;
    let showDetailModal = false;

    // Send message dialog state
    let showSendMessageDialog = false;
    let messageContent = "";
    let sendingMessage = false;
    let sendMessageSuccess = "";
    let sendMessageError = "";

    onMount(() => {
        // 生成测试数据
        const generateTestAlerts = () => {
            const testData = [];
            const devices = ["设备A", "设备B", "设备C", "设备D", "设备E"];
            const severities = ["high", "medium", "low"];
            const messages = [
                "温度异常升高，请立即检查",
                "设备离线，连接中断",
                "电池电量低，请及时充电",
                "GPS信号丢失",
                "数据上传异常",
                "设备重启完成",
                "固件更新可用",
                "内存使用率过高",
                "网络连接不稳定",
                "传感器数据异常",
            ];

            for (let i = 1; i <= 20; i++) {
                const deviceIndex = i % devices.length;
                const severityIndex = i % severities.length;
                const messageIndex = i % messages.length;

                testData.push({
                    ID: i,
                    device_id: deviceIndex + 1,
                    type: "alert",
                    message: messages[messageIndex],
                    level: severities[severityIndex],
                    read: i > 10, // 前10条未读，后10条已读
                    timestamp: Date.now() - i * 3600000, // 按小时递减
                    created_at: new Date(
                        Date.now() - i * 3600000,
                    ).toISOString(),
                    updated_at: new Date(
                        Date.now() - i * 3600000,
                    ).toISOString(),

                    device: {
                        ID: deviceIndex + 1,
                        name: devices[deviceIndex],
                        topic: `device/${deviceIndex + 1}`,
                        user_id: 1,
                        longitude: 116.3974 + deviceIndex * 0.01,
                        latitude: 39.9093 + deviceIndex * 0.01,
                        address: `北京市朝阳区第${deviceIndex + 1}号`,
                        status:
                            i % 3 === 0
                                ? "online"
                                : i % 3 === 1
                                  ? "offline"
                                  : "warning",
                        last_seen: Date.now() - deviceIndex * 60000,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                });
            }
            return testData;
        };

        // 如果没有真实数据，启用测试模式
        if (alerts.length === 0 && !loading) {
            testMode = true;
            testAlerts = generateTestAlerts();
        }
    });

    $: displayAlerts = testMode ? testAlerts : alerts;

    // 显示警报详情
    function showAlertDetail(alert) {
        selectedAlert = alert;
        showDetailModal = true;

        // 如果消息未读，标记为已读
        if (!alert.read) {
            // Validate alert ID before marking as read
            // markAsRead(alert.ID);
        }
    }

    // Send message functions
    function openSendMessageDialog() {
        showSendMessageDialog = true;
        messageContent = "";
        sendMessageSuccess = "";
        sendMessageError = "";
    }

    function closeSendMessageDialog() {
        showSendMessageDialog = false;
        messageContent = "";
        sendMessageSuccess = "";
        sendMessageError = "";
    }

    function handleSendMessageKeyDown(event) {
        if (event.key === "Escape") {
            closeSendMessageDialog();
        } else if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            if (messageContent.trim() && !sendingMessage) {
                sendImportantMessage();
            }
        }
    }

    async function sendImportantMessage() {
        if (!messageContent.trim()) {
            sendMessageError = "请输入消息内容";
            return;
        }

        sendingMessage = true;
        sendMessageError = "";
        sendMessageSuccess = "";

        try {
            // 发送重要消息到平台
            // 这里假设使用第一个设备作为发送源，或者可以设置为系统消息
            const deviceId =
                devices.length > 0 ? devices[0].id || devices[0].ID : 1;

            // 获取当前定位信息
            let locationData = null;
            try {
                locationData = await getCurrentLocation();
            } catch (locationError) {
                console.warn("获取定位信息失败:", locationError);
                // 定位失败不影响消息发送
            }

            await apiService.createAlert({
                device_id: deviceId,
                type: 9, //用户重要消息
                message: messageContent,
                level: "high", // 重要级别
                raw_data: JSON.stringify({
                    source: "user",
                    location: locationData,
                    timestamp: new Date().toISOString(),
                }),
            });

            sendMessageSuccess = "重要消息发送成功！";
            messageContent = "";

            // 刷新消息列表
            if (typeof onRefresh === "function") {
                onRefresh();
            }

            // 3秒后关闭对话框
            setTimeout(() => {
                closeSendMessageDialog();
            }, 3000);
        } catch (err) {
            console.error("Failed to send message:", err);
            sendMessageError = "发送消息失败，请稍后重试";
        } finally {
            sendingMessage = false;
        }
    }

    // 关闭详情模态框
    function closeDetailModal() {
        showDetailModal = false;
        selectedAlert = null;
    }

    // 解析 parsed_data
    function getParsedData(alert) {
        if (!alert.parsed_data) {
            return null;
        }

        try {
            return JSON.parse(alert.parsed_data);
        } catch (error) {
            console.error("Failed to parse parsed_data:", error);
            return null;
        }
    }

    // 格式化字段值
    function formatFieldValue(value) {
        if (value === null || value === undefined) {
            return "null";
        }
        if (typeof value === "object") {
            return JSON.stringify(value, null, 2);
        }
        return String(value);
    }

    // 获取设备名称
    function getDeviceName(alert) {
        // 如果alert已经有device对象且包含name，直接返回
        if (alert.device?.name) {
            return alert.device.name;
        }

        // 通过device_id在devices数组中查找对应的设备
        if (alert.device_id && devices.length > 0) {
            const device = devices.find((d) => d.ID === alert.device_id);
            return device?.name || "未知设备";
        }

        return "未知设备";
    }

    function getSeverityColor(severity) {
        switch (severity) {
            case "high":
                return "#f44336";
            case "medium":
                return "#ff9800";
            case "low":
                return "#2196f3";
            default:
                return "#757575";
        }
    }

    function getSeverityText(severity) {
        switch (severity) {
            case "high":
                return "高";
            case "medium":
                return "中";
            case "low":
                return "低";
            default:
                return severity;
        }
    }

    function formatTimestamp(timestamp) {
        let date;

        // 处理不同类型的时间戳
        if (typeof timestamp === "string") {
            date = new Date(timestamp);
        } else if (typeof timestamp === "number") {
            // 如果是数字时间戳，检查是否是毫秒级
            date =
                timestamp > 1000000000000
                    ? new Date(timestamp)
                    : new Date(timestamp * 1000);
        } else {
            date = new Date();
        }

        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return "刚刚";
        if (diffMins < 60) return `${diffMins}分钟前`;
        if (diffHours < 24) return `${diffHours}小时前`;
        if (diffDays < 7) return `${diffDays}天前`;
        return date.toLocaleDateString();
    }

    function markAsRead(alertId) {
        onMarkAsRead?.(alertId);
    }

    // 获取当前位置信息（仅Tauri GPS定位）
    async function getCurrentLocation() {
        // 只使用Tauri GPS定位
        if (!window.__TAURI__) {
            throw new Error("非Tauri环境，无法使用GPS定位");
        }

        try {
            // 动态导入Tauri地理定位插件
            const geolocationModule = await import(
                "@tauri-apps/plugin-geolocation"
            );

            // 检查位置权限
            let permissions = await geolocationModule.checkPermissions();

            // 如果需要权限，请求权限
            if (
                permissions.location === "prompt" ||
                permissions.location === "prompt-with-rationale"
            ) {
                permissions = await geolocationModule.requestPermissions([
                    "location",
                ]);
            }

            // 如果权限被授予，获取位置
            if (permissions.location === "granted") {
                const position = await geolocationModule.getCurrentPosition();
                const location = {
                    longitude: position.coords.longitude,
                    latitude: position.coords.latitude,
                    accuracy: position.coords.accuracy,
                    altitudeAccuracy: position.coords.altitudeAccuracy,
                    altitude: position.coords.altitude,
                    speed: position.coords.speed,
                    heading: position.coords.heading,
                    source: "tauri-gps",
                };
                console.log("Tauri GPS定位成功");
                return location;
            } else {
                throw new Error("位置权限被拒绝");
            }
        } catch (error) {
            console.error("Tauri GPS定位失败:", error);
            throw error;
        }
    }
</script>

<div class="messages-page">
    <!-- Header -->
    <header class="page-header">
        <h2>消息中心</h2>
    </header>

    <div class="content">
        <!-- Send Message Button -->
        <div class="send-message-section">
            <button
                class="send-message-btn"
                on:click={openSendMessageDialog}
                title="发送重要消息"
            >
                <span class="send-icon">📢</span>
            </button>
        </div>

        <!-- Test Mode Indicator -->
        {#if testMode}
            <div class="test-mode-indicator">
                <p>测试模式：显示20条模拟消息数据</p>
            </div>
        {/if}

        <!-- Alerts List -->
        {#if displayAlerts.length > 0}
            <div class="alerts-list">
                {#each displayAlerts as alert}
                    <div
                        class="alert-card"
                        class:read={alert.read}
                        on:click={() => showAlertDetail(alert)}
                        on:keydown={(e) => {
                            if (e.key === "Enter" || e.key === " ")
                                showAlertDetail(alert);
                        }}
                        role="button"
                        tabindex="0"
                    >
                        <div class="alert-content">
                            <div class="alert-header">
                                <div class="device-info">
                                    <span class="alert-icon">🔔</span>
                                    <h3>{getDeviceName(alert)}</h3>
                                </div>
                                <span
                                    class="severity-badge"
                                    style="background-color: {getSeverityColor(
                                        alert.level,
                                    )}"
                                >
                                    {getSeverityText(alert.level)}
                                </span>
                            </div>

                            <p class="alert-message">{alert.message}</p>

                            <div class="alert-footer">
                                <span class="timestamp">
                                    {formatTimestamp(alert.timestamp)}
                                </span>

                                {#if !alert.read}
                                    <button
                                        class="mark-read-btn"
                                        on:click={(e) => {
                                            e.stopPropagation();
                                            markAsRead(alert.ID);
                                        }}
                                    >
                                        标记已读
                                    </button>
                                {/if}
                            </div>
                        </div>
                    </div>
                {/each}
            </div>

            <!-- Detail Modal -->
            {#if showDetailModal && selectedAlert}
                <div
                    class="modal-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-title"
                >
                    <div class="modal-content" role="document">
                        <div class="modal-header">
                            <h3 id="modal-title">消息详情</h3>
                            <button
                                class="close-btn"
                                on:click={closeDetailModal}
                                aria-label="关闭对话框">×</button
                            >
                        </div>

                        <div class="modal-body">
                            <div class="detail-section">
                                <h4>基本信息</h4>
                                <div class="detail-grid">
                                    <div class="detail-item">
                                        <strong>设备名称:</strong>
                                        <span
                                            >{getDeviceName(
                                                selectedAlert,
                                            )}</span
                                        >
                                    </div>
                                    <div class="detail-item">
                                        <strong>严重程度:</strong>
                                        <span
                                            class="severity-badge"
                                            style="background-color: {getSeverityColor(
                                                selectedAlert.level,
                                            )}"
                                        >
                                            {getSeverityText(
                                                selectedAlert.level,
                                            )}
                                        </span>
                                    </div>
                                    <div class="detail-item">
                                        <strong>消息内容:</strong>
                                        <span>{selectedAlert.message}</span>
                                    </div>
                                    <div class="detail-item">
                                        <strong>时间:</strong>
                                        <span
                                            >{formatTimestamp(
                                                selectedAlert.timestamp,
                                            )}</span
                                        >
                                    </div>
                                </div>
                            </div>

                            {#if selectedAlert.parsed_data}
                                <div class="detail-section">
                                    <h4>解析数据</h4>
                                    <div class="parsed-data-container">
                                        <pre
                                            class="parsed-data-content">{selectedAlert.parsed_data}</pre>
                                    </div>
                                </div>
                            {/if}
                        </div>
                    </div>
                </div>
            {/if}
        {:else}
            <div class="empty-state">
                <p>暂无消息</p>
            </div>
        {/if}

        <!-- Send Message Dialog -->
        {#if showSendMessageDialog}
            <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
            <div
                class="dialog-overlay"
                on:keydown={handleSendMessageKeyDown}
                role="dialog"
                aria-modal="true"
            >
                <div
                    class="dialog send-message-dialog"
                    role="dialog"
                    aria-labelledby="send-message-title"
                >
                    <div class="dialog-header">
                        <h3 id="send-message-title">重要消息</h3>
                        <button
                            class="close-btn"
                            on:click={closeSendMessageDialog}
                            aria-label="关闭"
                        >
                            ×
                        </button>
                    </div>
                    <div class="dialog-content">
                        <div class="form">
                            <div class="form-group">
                                <textarea
                                    id="message-content"
                                    bind:value={messageContent}
                                    placeholder="请输入要发送的重要消息内容..."
                                    rows="6"
                                    disabled={sendingMessage}
                                ></textarea>
                            </div>
                        </div>
                    </div>
                    <div class="dialog-actions">
                        <button
                            class="cancel-btn"
                            on:click={closeSendMessageDialog}
                            disabled={sendingMessage}
                        >
                            取消
                        </button>
                        <button
                            class="confirm-btn send-btn"
                            on:click={sendImportantMessage}
                            disabled={sendingMessage || !messageContent.trim()}
                        >
                            {#if sendingMessage}
                                <span class="loading-spinner">⏳</span>
                                发送中...
                            {:else}
                                📢 发送
                            {/if}
                        </button>
                    </div>
                    {#if sendMessageError}
                        <div class="error-message">
                            {sendMessageError}
                        </div>
                    {/if}
                    {#if sendMessageSuccess}
                        <div class="success-message">
                            {sendMessageSuccess}
                        </div>
                    {/if}
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .messages-page {
        height: 100;
        overflow-y: auto;
        background-color: #f5f5f5;
    }

    .send-message-section {
        display: flex;
        justify-content: center;
        margin: 20px 0 40px 0;
        padding: 0 16px;
    }

    .send-message-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 60px;
        height: 60px;
        background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
        color: white;
        border: none;
        border-radius: 50%;
        font-size: 24px;
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(255, 107, 107, 0.3);
        transition: all 0.3s ease;
    }

    .send-message-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
        background: linear-gradient(135deg, #ff5252, #ff7b7b);
    }

    .send-message-btn:active {
        transform: translateY(0);
        box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3);
    }

    .send-icon {
        font-size: 28px;
    }

    .send-message-dialog {
        max-width: 500px;
        width: 90%;
    }

    .send-message-dialog .dialog-content {
        padding: 20px;
    }

    .send-message-dialog textarea {
        width: 100%;
        padding: 10px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        font-size: 16px;
        resize: vertical;
        transition: border-color 0.3s ease;
        box-sizing: border-box;
    }

    .send-message-dialog textarea:focus {
        outline: none;
        border-color: #ff6b6b;
        box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
    }

    .send-message-dialog textarea:disabled {
        background-color: #f5f5f5;
        cursor: not-allowed;
    }

    .send-btn {
        background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
        border: none;
    }

    .send-btn:hover:not(:disabled) {
        background: linear-gradient(135deg, #ff5252, #ff7b7b);
    }

    .send-btn:disabled {
        background: #ccc;
        cursor: not-allowed;
    }

    .error-message {
        background-color: #ffebee;
        color: #c62828;
        padding: 12px;
        margin: 16px;
        border-radius: 4px;
        font-size: 14px;
    }

    .success-message {
        background-color: #e8f5e8;
        color: #2e7d32;
        padding: 12px;
        margin: 16px;
        border-radius: 4px;
        font-size: 14px;
    }

    .loading-spinner {
        display: inline-block;
        margin-right: 8px;
    }

    .dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .dialog {
        background: white;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        max-width: 90%;
        max-height: 90%;
        overflow: auto;
    }

    .dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 20px 0 20px;
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
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .close-btn:hover {
        background-color: #f5f5f5;
        color: #333;
    }

    .dialog-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        padding: 20px;
        border-top: 1px solid #e0e0e0;
        border-bottom: 1px solid #e0e0e0;
    }

    .cancel-btn {
        padding: 10px 20px;
        border: 1px solid #ccc;
        background: white;
        border-radius: 4px;
        cursor: pointer;
        color: #333;
    }

    .cancel-btn:hover:not(:disabled) {
        background-color: #f5f5f5;
    }

    .confirm-btn {
        padding: 10px 20px;
        border: none;
        background: #1976d2;
        color: white;
        border-radius: 4px;
        cursor: pointer;
    }

    .confirm-btn:hover:not(:disabled) {
        background: #1565c0;
    }

    .confirm-btn:disabled {
        background: #ccc;
        cursor: not-allowed;
    }

    .page-header {
        background-color: rgba(245, 245, 245, 0.95);
        padding: 16px;
        text-align: center;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 100;
        border-bottom: 1px solid #e0e0e0;
    }

    .page-header h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
    }

    .content {
        margin-top: 60px;
        padding: 16px;
    }

    .test-mode-indicator {
        background: #fff3e0;
        border: 1px solid #ffb74d;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 16px;
    }

    .test-mode-indicator p {
        margin: 0;
        font-size: 14px;
        color: #e65100;
    }

    .alerts-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .alert-card {
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        transition: all 0.2s ease;
        cursor: pointer;
    }

    .alert-card.read {
        background: transparent;
    }

    .alert-card:not(.read) {
        background: #f5f5f5;
    }

    .alert-card:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .alert-content {
        padding: 12px;
    }

    .alert-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 8px;
        gap: 8px;
    }

    .device-info {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
    }

    .alert-icon {
        font-size: 16px;
    }

    .device-info h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #333;
    }

    .severity-badge {
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
    }

    .alert-message {
        margin: 0 0 8px 0;
        font-size: 14px;
        color: #333;
        line-height: 1.4;
        word-wrap: break-word;
        overflow-wrap: break-word;
        max-height: 42px;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
    }

    /* Modal Styles */
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 20px;
    }

    .modal-content {
        background: white;
        border-radius: 12px;
        width: 100%;
        max-width: 600px;
        max-height: 80vh;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid #e0e0e0;
    }

    .modal-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #333;
    }

    .close-btn {
        background: none;
        border: none;
        font-size: 24px;
        color: #666;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background-color 0.2s ease;
    }

    .close-btn:hover {
        background-color: #f5f5f5;
    }

    .modal-body {
        padding: 24px;
        overflow-y: auto;
        max-height: calc(80vh - 80px);
    }

    .detail-section {
        margin-bottom: 24px;
    }

    .detail-section h4 {
        margin: 0 0 16px 0;
        font-size: 16px;
        font-weight: 600;
        color: #333;
    }

    .detail-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
    }

    .detail-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
    }

    .detail-item span {
        flex: 1;
        font-size: 14px;
        color: #333;
        word-break: break-word;
    }

    .parsed-data-container {
        background-color: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 16px;
        margin-top: 8px;
    }

    .parsed-data-content {
        margin: 0;
        font-size: 13px;
        font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
        color: #495057;
        white-space: pre-wrap;
        word-break: break-all;
        line-height: 1.4;
        max-height: 300px;
        overflow-y: auto;
    }

    .alert-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .timestamp {
        font-size: 12px;
        color: #666;
    }

    .mark-read-btn {
        background: none;
        border: 1px solid #1976d2;
        color: #1976d2;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .mark-read-btn:hover {
        background-color: #1976d2;
        color: white;
    }

    .empty-state {
        background: white;
        padding: 32px;
        text-align: center;
        border-radius: 8px;
        margin-top: 16px;
    }

    .empty-state p {
        margin: 0;
        color: #666;
        font-size: 14px;
    }
</style>
