<script>
    import { apiService } from "../services/api";

    let username = "";
    let password = "";
    let email = "";
    let tab = 0;
    let loading = false;
    let error = "";
    let successMessage = "";

    function handleTabChange(newValue) {
        tab = newValue;
        error = "";
        successMessage = "";
    }

    async function handleSubmit(event) {
        event.preventDefault();
        loading = true;
        error = "";
        successMessage = "";

        try {
            if (tab === 0) {
                // Login
                const response = await apiService.login({ username, password });
                const { token } = response.data;

                // 只要有token就认为登录成功
                localStorage.setItem("token", token);
                const userInfo = { username, email: username + "@example.com" };
                localStorage.setItem("user", JSON.stringify(userInfo));
                window.location.href = "/";
            } else {
                // Register
                await apiService.register({ username, email, password });
                successMessage = "注册成功！请登录";
                tab = 0;
                username = "";
                password = "";
                email = "";
            }
        } catch (error) {
            error = error.response?.data?.error || "操作失败，请重试";
        } finally {
            loading = false;
        }
    }
</script>

<div class="login-page">
    <div class="container">
        <div class="login-form">
            <h1>要友卫星</h1>

            <div class="tabs">
                <div class="tab-header">
                    <button
                        class:active={tab === 0}
                        class="tab-button"
                        on:click={() => handleTabChange(0)}
                    >
                        登录
                    </button>
                    <button
                        class:active={tab === 1}
                        class="tab-button"
                        on:click={() => handleTabChange(1)}
                    >
                        注册
                    </button>
                </div>

                <form on:submit={handleSubmit}>
                    {#if error}
                        <div class="alert error">
                            <span>{error}</span>
                        </div>
                    {/if}

                    {#if successMessage}
                        <div class="alert success">
                            <span>{successMessage}</span>
                        </div>
                    {/if}

                    <div class="form-group">
                        <label for="username">用户名</label>
                        <input
                            id="username"
                            type="text"
                            bind:value={username}
                            required
                            disabled={loading}
                            placeholder="请输入用户名"
                        />
                    </div>

                    {#if tab === 1}
                        <div class="form-group">
                            <label for="email">邮箱</label>
                            <input
                                id="email"
                                type="email"
                                bind:value={email}
                                required
                                disabled={loading}
                                placeholder="请输入邮箱"
                            />
                        </div>
                    {/if}

                    <div class="form-group">
                        <label for="password">密码</label>
                        <input
                            id="password"
                            type="password"
                            bind:value={password}
                            required
                            disabled={loading}
                            placeholder="请输入密码"
                        />
                    </div>

                    <button type="submit" class="submit-btn" disabled={loading}>
                        {#if loading}
                            <span class="loading-spinner">⏳</span>
                        {:else if tab === 0}
                            登录
                        {:else}
                            注册
                        {/if}
                    </button>
                </form>

                <div class="switch-tab">
                    {#if tab === 0}
                        <p>
                            没有账号？<button
                                class="link-btn"
                                on:click={() => handleTabChange(1)}
                                >点击注册</button
                            >
                        </p>
                    {:else}
                        <p>
                            已有账号？<button
                                class="link-btn"
                                on:click={() => handleTabChange(0)}
                                >点击登录</button
                            >
                        </p>
                    {/if}
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    .login-page {
        min-height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
    }

    .container {
        width: 100%;
        max-width: 400px;
    }

    .login-form {
        background: white;
        border-radius: 16px;
        padding: 40px 32px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    }

    .login-form h1 {
        text-align: center;
        margin: 0 0 32px 0;
        font-size: 24px;
        font-weight: 600;
        color: #333;
    }

    .tabs {
        width: 100%;
    }

    .tab-header {
        display: flex;
        border-bottom: 1px solid #e0e0e0;
        margin-bottom: 24px;
    }

    .tab-button {
        flex: 1;
        background: none;
        border: none;
        padding: 12px 16px;
        font-size: 16px;
        font-weight: 500;
        color: #666;
        cursor: pointer;
        transition: all 0.2s ease;
        border-bottom: 2px solid transparent;
    }

    .tab-button.active {
        color: #1976d2;
        border-bottom-color: #1976d2;
    }

    .tab-button:hover:not(.active) {
        color: #333;
        background-color: #f5f5f5;
    }

    .form-group {
        margin-bottom: 20px;
    }

    .form-group label {
        display: block;
        margin-bottom: 8px;
        font-size: 14px;
        font-weight: 500;
        color: #333;
    }

    .form-group input {
        width: 100%;
        padding: 12px 16px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 16px;
        transition: border-color 0.2s ease;
        box-sizing: border-box;
    }

    .form-group input:focus {
        outline: none;
        border-color: #1976d2;
        box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
    }

    .form-group input:disabled {
        background-color: #f5f5f5;
        color: #999;
        cursor: not-allowed;
    }

    .alert {
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 20px;
        font-size: 14px;
    }

    .alert.error {
        background-color: #ffebee;
        color: #c62828;
        border: 1px solid #ffcdd2;
    }

    .alert.success {
        background-color: #e8f5e8;
        color: #2e7d32;
        border: 1px solid #c8e6c9;
    }

    .submit-btn {
        width: 100%;
        background: #1976d2;
        color: white;
        border: none;
        padding: 14px 16px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }

    .submit-btn:hover:not(:disabled) {
        background: #1565c0;
    }

    .submit-btn:disabled {
        background-color: #ccc;
        cursor: not-allowed;
    }

    .loading-spinner {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    .switch-tab {
        text-align: center;
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid #f0f0f0;
    }

    .switch-tab p {
        margin: 0;
        color: #666;
        font-size: 14px;
    }

    .link-btn {
        background: none;
        border: none;
        color: #1976d2;
        cursor: pointer;
        font-size: 14px;
        text-decoration: underline;
        padding: 0;
    }

    .link-btn:hover {
        color: #1565c0;
    }
</style>
