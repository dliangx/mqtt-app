<script>
    export const onRefresh = () => {};
    export let onLogout = () => {};

    let user = {};
    let token = "";

    import { onMount } from "svelte";
    onMount(() => {
        loadUserData();
    });

    function loadUserData() {
        try {
            const userData = localStorage.getItem("user");
            if (userData) {
                user = JSON.parse(userData);
            }
            token = localStorage.getItem("token") || "";
        } catch (error) {
            console.error("Failed to parse user data:", error);
        }
    }

    function handleLogout() {
        console.log("ProfilePage: Logout button clicked");
        // Call parent logout handler to handle all logout logic
        onLogout?.();
        console.log("ProfilePage: onLogout called");
    }

    function handleClearCache() {
        localStorage.clear();
        window.location.reload();
    }

    const appInfo = {
        version: "1.0.0",
        buildDate: "2024-01-01",
        environment: "production",
    };
</script>

<div class="profile-page">
    <!-- User Info -->
    <div class="user-card">
        <div class="user-header">
            <span class="user-icon">👤</span>
            <div class="user-details">
                <h1>{user.username || "用户"}</h1>
                <p>{user.email || "未设置邮箱"}</p>
            </div>
        </div>

        <div class="app-info">
            <span class="version-badge">版本: {appInfo.version}</span>
        </div>
    </div>

    <!-- Actions -->
    <div class="actions-section">
        {#if token}
            <div class="divider"></div>
            <button class="logout-btn" on:click={handleLogout}>
                <span class="icon">🚪</span>
                <span>退出登录</span>
            </button>
            <div class="divider"></div>
        {/if}
    </div>
</div>

<style>
    .profile-page {
        height: 100;
        overflow-y: auto;
        background-color: #f5f5f5;
        padding: 16px;
    }

    .user-card {
        background: white;
        border-radius: 12px;
        padding: 24px;
        margin-bottom: 24px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .user-header {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 16px;
    }

    .user-icon {
        font-size: 48px;
        color: #1976d2;
    }

    .user-details h1 {
        margin: 0 0 4px 0;
        font-size: 20px;
        font-weight: 600;
        color: #333;
    }

    .user-details p {
        margin: 0;
        font-size: 14px;
        color: #666;
    }

    .app-info {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }

    .version-badge {
        background: none;
        border: 1px solid #1976d2;
        color: #1976d2;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
    }

    .actions-section {
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .divider {
        height: 1px;
        background-color: #e0e0e0;
        margin: 0;
    }

    .logout-btn {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        background: none;
        border: none;
        padding: 16px;
        color: #f44336;
        font-size: 16px;
        cursor: pointer;
        transition: background-color 0.2s ease;
    }

    .logout-btn:hover {
        background-color: #ffebee;
    }

    .logout-btn .icon {
        font-size: 20px;
    }

    .logout-btn span {
        font-weight: 500;
    }
</style>
