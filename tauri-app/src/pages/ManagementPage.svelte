<script>
    import { apiService } from "../services/api";

    export let devices = [];
    export let loading = false;
    export let onRefresh = () => {};

    let addDeviceDialog = false;
    let newDevice = {
        name: "",
        topic: "",
        longitude: 0,
        latitude: 0,
        address: "",
    };

    async function handleAddDevice() {
        try {
            await apiService.createDevice(newDevice);
            addDeviceDialog = false;
            newDevice = {
                name: "",
                topic: "",
                longitude: 0,
                latitude: 0,
                address: "",
            };
            onRefresh?.();
        } catch (err) {
            console.error("Failed to add device:", err);
        }
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

    function openAddDialog() {
        addDeviceDialog = true;
    }

    function closeAddDialog() {
        addDeviceDialog = false;
        newDevice = {
            name: "",
            topic: "",
            longitude: 0,
            latitude: 0,
            address: "",
        };
    }

    function handleOverlayKeyDown(event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            closeAddDialog();
        }
    }

    function handleDialogKeyDown(event) {
        if (event.key === "Escape") {
            closeAddDialog();
        }
    }
</script>

<div class="management-page">
    <!-- Header -->
    <header class="page-header">
        <h2>设备管理</h2>
    </header>

    <div class="content">
        <div class="actions">
            <button class="add-btn" onclick={openAddDialog}>
                <span class="icon">+</span>
                添加设备
            </button>
        </div>

        <div class="divider"></div>

        <!-- Device List -->
        <div class="device-grid">
            {#each devices as device}
                <div class="device-card">
                    <div class="card-content">
                        <div class="device-header">
                            <h3>{device.name}</h3>
                            <span
                                class="status-badge"
                                style="background-color: {getStatusColor(
                                    device.status,
                                )}"
                            >
                                {getStatusText(device.status)}
                            </span>
                        </div>

                        <div class="device-info">
                            <span class="info-label">Topic:</span>
                            <p>{device.topic}</p>
                        </div>

                        {#if device.longitude && device.latitude}
                            <div class="location-info">
                                <span class="location-icon">📍</span>
                                <span>
                                    {Number(device.longitude).toFixed(6)}, {Number(
                                        device.latitude,
                                    ).toFixed(6)}
                                </span>
                            </div>
                        {/if}

                        {#if device.address}
                            <div class="address-info">
                                <p>{device.address}</p>
                            </div>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>

        {#if devices.length === 0 && !loading}
            <div class="empty-state">
                <p>暂无设备，请添加设备</p>
            </div>
        {/if}
    </div>

    <!-- Add Device Dialog -->
    {#if addDeviceDialog}
        <div
            class="dialog-overlay"
            role="button"
            tabindex="0"
            onclick={closeAddDialog}
            onkeydown={handleOverlayKeyDown}
            aria-label="关闭对话框"
        >
            <div
                class="dialog"
                role="dialog"
                aria-labelledby="add-device-title"
                aria-modal="true"
                onclick={(e) => e.stopPropagation()}
                onkeydown={handleDialogKeyDown}
            >
                <div class="dialog-header">
                    <h3 id="add-device-title">添加新设备</h3>
                    <button
                        class="close-btn"
                        onclick={closeAddDialog}
                        aria-label="关闭对话框">×</button
                    >
                </div>

                <div class="dialog-content">
                    <div class="form">
                        <div class="form-group">
                            <label for="device-name">设备名称 *</label>
                            <input
                                id="device-name"
                                type="text"
                                bind:value={newDevice.name}
                                placeholder="请输入设备名称"
                            />
                        </div>

                        <div class="form-group">
                            <label for="device-topic">设备 Topic *</label>
                            <input
                                id="device-topic"
                                type="text"
                                bind:value={newDevice.topic}
                                placeholder="请输入设备 Topic"
                            />
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="device-longitude">经度</label>
                                <input
                                    id="device-longitude"
                                    type="number"
                                    bind:value={newDevice.longitude}
                                    placeholder="0"
                                    step="0.000001"
                                />
                            </div>

                            <div class="form-group">
                                <label for="device-latitude">纬度</label>
                                <input
                                    id="device-latitude"
                                    type="number"
                                    bind:value={newDevice.latitude}
                                    placeholder="0"
                                    step="0.000001"
                                />
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="device-address">地址</label>
                            <textarea
                                id="device-address"
                                bind:value={newDevice.address}
                                placeholder="请输入设备地址"
                                rows="2"
                            ></textarea>
                        </div>
                    </div>
                </div>

                <div class="dialog-actions">
                    <button class="cancel-btn" onclick={closeAddDialog}
                        >取消</button
                    >
                    <button
                        class="confirm-btn"
                        onclick={handleAddDevice}
                        disabled={!newDevice.name || !newDevice.topic}
                    >
                        添加
                    </button>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .management-page {
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

    .actions {
        margin-bottom: 16px;
    }

    .add-btn {
        background-color: #1976d2;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: background-color 0.2s ease;
    }

    .add-btn:hover {
        background-color: #1565c0;
    }

    .add-btn .icon {
        font-size: 16px;
        font-weight: bold;
    }

    .divider {
        height: 1px;
        background-color: #e0e0e0;
        margin: 8px 0;
    }

    .device-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 16px;
        margin-top: 16px;
    }

    .device-card {
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 12px;
        overflow: hidden;
        transition: box-shadow 0.2s ease;
    }

    .device-card:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .card-content {
        padding: 16px;
    }

    .device-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;
    }

    .device-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        flex: 1;
        margin-right: 8px;
    }

    .status-badge {
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
    }

    .device-info {
        margin-bottom: 8px;
    }

    .info-label {
        font-size: 12px;
        color: #666;
        display: block;
        margin-bottom: 2px;
        font-weight: 500;
    }

    .device-info p {
        margin: 0;
        font-size: 14px;
        color: #333;
    }

    .location-info {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-bottom: 8px;
        font-size: 12px;
        color: #666;
    }

    .location-icon {
        font-size: 14px;
    }

    .address-info p {
        margin: 0;
        font-size: 12px;
        color: #666;
        line-height: 1.4;
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
        padding: 20px 24px 0;
        border-bottom: 1px solid #e0e0e0;
        padding-bottom: 16px;
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

    .form {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .form-group {
        display: flex;
        flex-direction: column;
    }

    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
    }

    .form-group label {
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 4px;
        color: #333;
    }

    .form-group input,
    .form-group textarea {
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        transition: border-color 0.2s ease;
    }

    .form-group input:focus,
    .form-group textarea:focus {
        outline: none;
        border-color: #1976d2;
    }

    .form-group textarea {
        resize: vertical;
        min-height: 60px;
    }

    .dialog-actions {
        padding: 16px 24px;
        border-top: 1px solid #e0e0e0;
        display: flex;
        justify-content: flex-end;
        gap: 12px;
    }

    .cancel-btn {
        background: none;
        border: 1px solid #ddd;
        color: #666;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s ease;
    }

    .cancel-btn:hover {
        background-color: #f5f5f5;
    }

    .confirm-btn {
        background: #1976d2;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s ease;
    }

    .confirm-btn:hover:not(:disabled) {
        background: #1565c0;
    }

    .confirm-btn:disabled {
        background-color: #ccc;
        cursor: not-allowed;
    }
</style>
