<script>
    import { onMount } from "svelte";

    export let alerts = [];
    export let devices = [];
    export const unreadCount = 0;
    export let loading = false;
    export let onMarkAsRead = () => {};
    export const onRefresh = () => {};

    let testMode = false;
    let testAlerts = [];

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
                    id: i,
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
                        id: deviceIndex + 1,
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
        const date = new Date(
            typeof timestamp === "string" ? timestamp : timestamp,
        );
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
</script>

<div class="messages-page">
    <!-- Header -->
    <header class="page-header">
        <h2>消息中心</h2>
    </header>

    <div class="content">
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
                    <div class="alert-card" class:read={alert.read}>
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
                                        onclick={() => markAsRead(alert.id)}
                                    >
                                        标记已读
                                    </button>
                                {/if}
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {:else}
            <div class="empty-state">
                <p>{loading ? "加载中..." : "暂无消息"}</p>
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
