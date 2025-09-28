<script>
  export let currentTab = 0;
  export let unreadAlerts = 0;
  export let onTabChange = () => {};

  function handleTabChange(newValue) {
    console.log('BottomNavigation: Tab changed to', newValue);
    if (typeof onTabChange === 'function') {
      onTabChange(newValue);
    } else {
      console.warn('onTabChange is not a function:', onTabChange);
    }
  }

  const tabs = [
    { label: '监控', icon: '📊' },
    { label: '管理', icon: '⚙️' },
    { label: '消息', icon: '🔔' },
    { label: '我的', icon: '👤' }
  ];
</script>

<nav class="bottom-navigation">
  {#each tabs as tab, index}
    <button
      class:active={currentTab === index}
      class="nav-item"
      on:click={() => handleTabChange(index)}
    >
      <div class="icon-container">

        <span class="icon">{tab.icon}</span>
      </div>
      <span class="label">{tab.label}</span>
    </button>
  {/each}
</nav>

<style>
  .bottom-navigation {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background-color: #fff;
    border-top: 1px solid #e0e0e0;
    height: 64px;
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 0;
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    padding: 8px 12px;
    min-width: 60px;
    cursor: pointer;
    color: #666;
    transition: all 0.2s ease;
    position: relative;
  }

  .nav-item:hover {
    background-color: #f5f5f5;
  }

  .nav-item.active {
    color: #1976d2;
  }

  .icon-container {
    position: relative;
    margin-bottom: 4px;
  }

  .icon {
    font-size: 20px;
  }

  .label {
    font-size: 12px;
    font-weight: 500;
  }

  .badge {
    position: absolute;
    top: -6px;
    right: -6px;
    background-color: #f44336;
    color: white;
    border-radius: 10px;
    min-width: 18px;
    height: 18px;
    font-size: 10px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
  }
</style>
