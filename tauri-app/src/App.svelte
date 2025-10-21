<script>
    import { onMount } from "svelte";
    import BottomNavigation from "./components/BottomNavigation.svelte";
    import MonitorPage from "./pages/MonitorPage.svelte";
    import ManagementPage from "./pages/ManagementPage.svelte";
    import MessagesPage from "./pages/MessagesPage.svelte";
    import ProfilePage from "./pages/ProfilePage.svelte";
    import LoginPage from "./pages/LoginPage.svelte";
    import { apiService } from "./services/api";

    // Reactive state
    let currentTab = 0;
    let devices = [];
    let alerts = [];
    let unreadAlerts = 0;
    let loading = true;
    let error = "";
    let success = "";
    let isAuthenticated = !!localStorage.getItem("token");
    let deviceGroups = [];

    // Function to update devices from child components
    function updateDevices(updatedDevices) {
        devices = updatedDevices;
    }

    let intervalId;

    onMount(() => {
        const token = localStorage.getItem("token");
        isAuthenticated = !!token;
        if (token) {
            fetchData();
            intervalId = window.setInterval(fetchData, 300000); // 5分钟刷新一次
        } else {
            loading = false;
        }
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    });

    async function fetchData() {
        try {
            loading = true;
            await Promise.all([
                fetchDevices(),
                fetchAlerts(),
                fetchUnreadAlerts(),
                fetchDeviceGroups(),
            ]);
        } catch (err) {
            error = "获取数据失败";
            console.error("Failed to fetch data:", err);

            // Auto-hide error message after 5 seconds
            setTimeout(() => {
                error = "";
            }, 5000);
        } finally {
            loading = false;
        }
    }

    async function fetchDevices() {
        try {
            const response = await apiService.getDevices();
            const devicesData = Array.isArray(response) ? [...response] : [];
            console.log(devicesData);
            // 只有当设备数据实际发生变化时才更新
            const currentDevicesHash = JSON.stringify(
                devicesData.map((device) => ({
                    id: device.id,
                    name: device.name,
                    longitude: device.longitude,
                    latitude: device.latitude,
                    status: device.status,
                    topic: device.topic,
                    address: device.address,
                })),
            );
            const previousDevicesHash = JSON.stringify(
                devices.map((device) => ({
                    id: device.id,
                    name: device.name,
                    longitude: device.longitude,
                    latitude: device.latitude,
                    status: device.status,
                    topic: device.topic,
                    address: device.address,
                })),
            );

            if (currentDevicesHash !== previousDevicesHash) {
                devices = devicesData;
                console.log(`[App] 设备数据发生变化，更新设备列表`);
            }
        } catch (err) {
            console.error("Failed to fetch devices:", err);
            if (err.response?.status === 400) {
                console.log("Received 400 error, logging out...");
                handleLogout();
            }
        }
    }

    async function fetchAlerts() {
        try {
            const response = await apiService.getAlerts();
            console.log("fetchAlerts response:", response);
            alerts = Array.isArray(response) ? [...response] : [];
            console.log("Processed alerts:", alerts);
        } catch (err) {
            console.error("Failed to fetch alerts:", err);
            if (err.response?.status === 400) {
                console.log("Received 400 error, logging out...");
                handleLogout();
            }
        }
    }

    async function fetchUnreadAlerts() {
        try {
            const response = await apiService.getUnreadAlerts();
            unreadAlerts = response || 0;
        } catch (err) {
            console.error("Failed to fetch unread alerts:", err);
        }
    }

    async function fetchDeviceGroups() {
        try {
            const response = await apiService.getDeviceGroups();
            deviceGroups = Array.isArray(response) ? [...response] : [];
        } catch (err) {
            console.error("Failed to fetch device groups:", err);
        }
    }

    function handleRefresh() {
        fetchData();
    }

    async function handleMarkAsRead(alertId) {
        try {
            await apiService.markAlertAsRead(alertId);
            success = "标记为已读成功";

            // Update local state directly instead of refetching
            const alertIndex = alerts.findIndex(
                (alert) => (alert.id || alert.ID) === alertId,
            );
            if (alertIndex !== -1) {
                alerts[alertIndex].read = true;
                alerts = alerts; // Trigger reactivity
            }

            // Update unread count
            unreadAlerts = Math.max(0, unreadAlerts - 1);

            // Auto-hide success message after 3 seconds
            setTimeout(() => {
                success = "";
            }, 3000);
        } catch (err) {
            error = "标记为已读失败";

            // Auto-hide error message after 5 seconds
            setTimeout(() => {
                error = "";
            }, 3000);
        }
    }

    function handleLogout() {
        console.log("Logout: Starting logout process");

        // Clear local storage
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        console.log("Logout: Local storage cleared");

        // Update authentication state
        isAuthenticated = false;
        console.log("Logout: Authentication state updated to false");

        // Clear data
        devices = [];
        alerts = [];
        unreadAlerts = 0;
        currentTab = 0;
        console.log("Logout: All data cleared");

        // Clear any existing intervals
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
            console.log("Logout: Interval cleared");
        }

        console.log("Logout: Process completed");

        // Force reload to ensure clean state
        window.location.reload();
    }

    function handleTabChange(newValue) {
        currentTab = newValue;
        console.log("App: currentTab changed to", currentTab);
    }

    // 页面切换时记录日志
    $: {
        console.log("Reactive: currentTab is", currentTab);
    }

    function clearError() {
        error = "";
    }

    function clearSuccess() {
        success = "";
    }
</script>

{#if !isAuthenticated}
    <LoginPage />
{:else if loading && devices.length === 0}
    <div class="container">
        <div class="loading-container">
            <p>加载中...</p>
        </div>
    </div>
{:else}
    <div class="app-container">
        <div class="content">
            {#if currentTab === 0}
                <MonitorPage {devices} {alerts} onRefresh={handleRefresh} />
            {:else if currentTab === 1}
                <ManagementPage
                    {devices}
                    {loading}
                    {deviceGroups}
                    onUpdateDevices={updateDevices}
                />
            {:else if currentTab === 2}
                <MessagesPage
                    {alerts}
                    {devices}
                    unreadCount={unreadAlerts}
                    {loading}
                    onMarkAsRead={handleMarkAsRead}
                    onRefresh={handleRefresh}
                />
            {:else if currentTab === 3}
                <ProfilePage
                    onRefresh={handleRefresh}
                    onLogout={handleLogout}
                />
            {/if}
        </div>

        <BottomNavigation
            {currentTab}
            onTabChange={handleTabChange}
            {unreadAlerts}
        />

        {#if error}
            <div class="snackbar error">
                <span>{error}</span>
                <button onclick={clearError}>×</button>
            </div>
        {/if}

        {#if success}
            <div class="snackbar success">
                <span>{success}</span>
                <button onclick={clearSuccess}>×</button>
            </div>
        {/if}
    </div>
{/if}

<style>
    .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 16px;
    }

    .loading-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 80vh;
    }

    .app-container {
        position: relative;
        height: 100vh;
        overflow: hidden;
    }

    .content {
        height: calc(100vh - 64px);
        overflow-y: auto;
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
        z-index: 1000;
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
