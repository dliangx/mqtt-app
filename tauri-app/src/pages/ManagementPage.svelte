<script>
    import { apiService } from "../services/api";

    export let devices = [];
    export let loading = false;
    export let deviceGroups = [];
    export let onUpdateDevices = (devices) => {};

    let success = "";
    let error = "";

    let addDeviceDialog = false;
    let editDeviceDialog = false;

    let newDevice = {
        name: "",
        topic: "",
        group_id: undefined,
        longitude: 0,
        latitude: 0,
        address: "",
    };

    let editingDevice = null;

    async function handleAddDevice() {
        try {
            const response = await apiService.createDevice({
                ...newDevice,
                group_id: newDevice.group_id
                    ? Number(newDevice.group_id)
                    : undefined,
            });

            // Add the new device to the devices array with the returned data
            if (response.data) {
                const newDeviceData = response.data;
                const updatedDevices = [...devices, newDeviceData];
                devices = updatedDevices;
                // Update parent component
                onUpdateDevices(updatedDevices);
            }

            success = "设备添加成功";
            addDeviceDialog = false;
            newDevice = {
                name: "",
                topic: "",
                group_id: undefined,
                longitude: 0,
                latitude: 0,
                address: "",
            };

            // Auto-hide success message after 3 seconds
            setTimeout(() => {
                success = "";
            }, 3000);
        } catch (err) {
            error = "设备添加失败";
            console.error("Failed to add device:", err);

            // Auto-hide error message after 5 seconds
            setTimeout(() => {
                error = "";
            }, 5000);
        }
    }

    async function handleEditDevice() {
        if (!editingDevice) return;

        try {
            const deviceId = editingDevice.id || editingDevice.ID;
            console.log(newDevice);
            const response = await apiService.updateDevice(deviceId, {
                name: newDevice.name,
                topic: newDevice.topic,
                group_id: newDevice.group_id
                    ? Number(newDevice.group_id)
                    : null,
                longitude: newDevice.longitude,
                latitude: newDevice.latitude,
                address: newDevice.address,
            });

            // Update the device in the devices array with the returned data
            if (response.data) {
                const updatedDevice = response.data;
                const deviceIndex = devices.findIndex(
                    (device) => (device.id || device.ID) === deviceId,
                );
                if (deviceIndex !== -1) {
                    const updatedDevices = [...devices];
                    updatedDevices[deviceIndex] = updatedDevice;
                    devices = updatedDevices; // Trigger reactivity
                    // Update parent component
                    onUpdateDevices(updatedDevices);
                }
            }

            success = "设备更新成功";
            editDeviceDialog = false;
            editingDevice = null;
            newDevice = {
                name: "",
                topic: "",
                group_id: null,
                longitude: 0,
                latitude: 0,
                address: "",
            };

            // Auto-hide success message after 3 seconds
            setTimeout(() => {
                success = "";
            }, 3000);
        } catch (err) {
            error = "设备更新失败";
            console.error("Failed to update device:", err);

            // Auto-hide error message after 5 seconds
            setTimeout(() => {
                error = "";
            }, 5000);
        }
    }

    async function handleDeleteDevice(id) {
        try {
            await apiService.deleteDevice(id);
            // Remove the device from the devices array directly
            const updatedDevices = devices.filter(
                (device) => (device.id || device.ID) !== id,
            );
            devices = updatedDevices;
            // Update parent component
            onUpdateDevices(updatedDevices);
            success = "设备删除成功";

            // Auto-hide success message after 3 seconds
            setTimeout(() => {
                success = "";
            }, 3000);
        } catch (err) {
            error = "设备删除失败";
            console.error("Failed to delete device:", err);

            // Auto-hide error message after 5 seconds
            setTimeout(() => {
                error = "";
            }, 5000);
        }
    }

    function openAddDialog() {
        addDeviceDialog = true;
    }

    function openEditDialog(device) {
        editingDevice = device;
        newDevice = {
            name: device.name,
            topic: device.topic,
            group_id: device.group_id,
            longitude: device.longitude,
            latitude: device.latitude,
            address: device.address,
        };

        editDeviceDialog = true;
    }

    function closeAddDialog() {
        addDeviceDialog = false;
        newDevice = {
            name: "",
            topic: "",
            group_id: undefined,
            longitude: 0,
            latitude: 0,
            address: "",
        };
    }

    function closeEditDialog() {
        editDeviceDialog = false;
        editingDevice = null;
        newDevice = {
            name: "",
            topic: "",
            group_id: null,
            longitude: 0,
            latitude: 0,
            address: "",
        };
    }

    function handleOverlayKeyDown(event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            closeAddDialog();
            closeEditDialog();
        }
    }

    function handleDialogKeyDown(event) {
        if (event.key === "Escape") {
            closeAddDialog();
            closeEditDialog();
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

    function formatDateTime(timestamp) {
        if (!timestamp || timestamp === 0) {
            return "未知时间";
        }

        // 检查时间戳格式，可能是秒或毫秒
        let date;
        if (timestamp > 1000000000000) {
            // 毫秒时间戳
            date = new Date(timestamp);
        } else {
            // 秒时间戳
            date = new Date(timestamp * 1000);
        }

        // 检查日期是否有效
        if (isNaN(date.getTime())) {
            return "时间格式错误";
        }

        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) {
            return "刚刚";
        } else if (diffMins < 60) {
            return diffMins + "分钟前";
        } else if (diffHours < 24) {
            return diffHours + "小时前";
        } else if (diffDays < 7) {
            return diffDays + "天前";
        } else {
            return (
                date.getFullYear() +
                "/" +
                (date.getMonth() + 1) +
                "/" +
                date.getDate() +
                " " +
                date.getHours() +
                ":" +
                (date.getMinutes() < 10 ? "0" : "") +
                date.getMinutes()
            );
        }
    }

    function clearError() {
        error = "";
    }

    function clearSuccess() {
        success = "";
    }
</script>

<div class="management-page">
    <!-- Header -->
    <header class="page-header">
        <h2>设备管理</h2>
    </header>

    <div class="content">
        <div class="actions">
            <button class="add-btn" on:click={openAddDialog}>
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

                        <div class="device-info">
                            <span class="info-label">设备组:</span>
                            <p>
                                {#if !device.group_id}
                                    未分组
                                {:else if loading}
                                    加载中...
                                {:else}
                                    {#each deviceGroups as group}
                                        {#if group.ID === device.group_id}
                                            {group.name}
                                        {/if}
                                    {/each}
                                    {#if !deviceGroups.some((g) => g.ID === device.group_id)}
                                        未分组
                                    {/if}
                                {/if}
                            </p>
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

                        <div class="device-info">
                            <span class="info-label">最后在线:</span>
                            <p>{formatDateTime(device.last_seen)}</p>
                        </div>

                        <div class="device-actions">
                            <button
                                class="edit-btn"
                                on:click={() => openEditDialog(device)}
                            >
                                编辑
                            </button>
                            <button
                                class="delete-btn"
                                on:click={() =>
                                    handleDeleteDevice(device.id || device.ID)}
                            >
                                删除
                            </button>
                        </div>
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
            on:click={closeAddDialog}
            on:keydown={handleOverlayKeyDown}
            aria-label="关闭对话框"
        >
            <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
            <div
                class="dialog"
                role="dialog"
                aria-labelledby="add-device-title"
                aria-modal="true"
                on:click={(e) => e.stopPropagation()}
                on:keydown={handleDialogKeyDown}
            >
                <div class="dialog-header">
                    <h3 id="add-device-title">添加新设备</h3>
                    <button
                        class="close-btn"
                        on:click={closeAddDialog}
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

                        <div class="form-group">
                            <label for="device-group">设备组</label>
                            <select
                                id="device-group"
                                bind:value={newDevice.group_id}
                            >
                                <option value={undefined}>未分组</option>
                                {#each deviceGroups as group}
                                    <option value={String(group.ID || group.id)}
                                        >{group.name}</option
                                    >
                                {/each}
                            </select>
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
                    <button class="cancel-btn" on:click={closeAddDialog}
                        >取消</button
                    >
                    <button
                        class="confirm-btn"
                        on:click={handleAddDevice}
                        disabled={!newDevice.name || !newDevice.topic}
                    >
                        添加
                    </button>
                </div>
            </div>
        </div>
    {/if}

    <!-- Edit Device Dialog -->
    {#if editDeviceDialog}
        <div
            class="dialog-overlay"
            role="button"
            tabindex="0"
            on:click={closeEditDialog}
            on:keydown={handleOverlayKeyDown}
            aria-label="关闭对话框"
        >
            <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
            <div
                class="dialog"
                role="dialog"
                aria-labelledby="edit-device-title"
                aria-modal="true"
                on:click={(e) => e.stopPropagation()}
                on:keydown={handleDialogKeyDown}
            >
                <div class="dialog-header">
                    <h3 id="edit-device-title">编辑设备</h3>
                    <button
                        class="close-btn"
                        on:click={closeEditDialog}
                        aria-label="关闭对话框">×</button
                    >
                </div>

                <div class="dialog-content">
                    <div class="form">
                        <div class="form-group">
                            <label for="edit-device-name">设备名称 *</label>
                            <input
                                id="edit-device-name"
                                type="text"
                                bind:value={newDevice.name}
                                placeholder="请输入设备名称"
                            />
                        </div>

                        <div class="form-group">
                            <label for="edit-device-topic">设备 Topic *</label>
                            <input
                                id="edit-device-topic"
                                type="text"
                                bind:value={newDevice.topic}
                                placeholder="请输入设备 Topic"
                            />
                        </div>

                        <div class="form-group">
                            <label for="edit-device-group">设备组</label>
                            <select
                                id="edit-device-group"
                                bind:value={newDevice.group_id}
                            >
                                <option value={null}>未分组</option>
                                {#each deviceGroups as group}
                                    <option value={group.ID}
                                        >{group.name}</option
                                    >
                                {/each}
                            </select>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-device-longitude">经度</label>
                                <input
                                    id="edit-device-longitude"
                                    type="number"
                                    bind:value={newDevice.longitude}
                                    placeholder="0"
                                    step="0.000001"
                                />
                            </div>

                            <div class="form-group">
                                <label for="edit-device-latitude">纬度</label>
                                <input
                                    id="edit-device-latitude"
                                    type="number"
                                    bind:value={newDevice.latitude}
                                    placeholder="0"
                                    step="0.000001"
                                />
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="edit-device-address">地址</label>
                            <textarea
                                id="edit-device-address"
                                bind:value={newDevice.address}
                                placeholder="请输入设备地址"
                                rows="2"
                            ></textarea>
                        </div>
                    </div>
                </div>

                <div class="dialog-actions">
                    <button class="cancel-btn" on:click={closeEditDialog}
                        >取消</button
                    >
                    <button
                        class="confirm-btn"
                        on:click={handleEditDevice}
                        disabled={!newDevice.name || !newDevice.topic}
                    >
                        保存
                    </button>
                </div>
            </div>
        </div>
    {/if}
    {#if error}
        <div class="snackbar error">
            <span>{error}</span>
            <button on:click={clearError}>×</button>
        </div>
    {/if}

    {#if success}
        <div class="snackbar success">
            <span>{success}</span>
            <button on:click={clearSuccess}>×</button>
        </div>
    {/if}
</div>

<style>
    .management-page {
        height: 100%;
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
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 16px;
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
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .info-label {
        font-size: 12px;
        color: #666;
        font-weight: 500;
        white-space: nowrap;
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

    .device-actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
    }

    .edit-btn,
    .delete-btn {
        padding: 4px 8px;
        border: none;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        transition: background-color 0.2s ease;
    }

    .edit-btn {
        background-color: #ff9800;
        color: white;
    }

    .edit-btn:hover {
        background-color: #f57c00;
    }

    .delete-btn {
        background-color: #f44336;
        color: white;
    }

    .delete-btn:hover {
        background-color: #d32f2f;
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
    .form-group textarea,
    .form-group select {
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        transition: border-color 0.2s ease;
        background-color: white;
        display: block;
        width: 100%;
        box-sizing: border-box;
    }

    .form-group input:focus,
    .form-group textarea:focus,
    .form-group select:focus {
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

    .snackbar {
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 20px;
        border-radius: 4px;
        color: white;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 9999;
        max-width: 90%;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .snackbar.error {
        background-color: #f44336;
    }

    .snackbar.success {
        background-color: #4caf50;
    }

    .snackbar button {
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
