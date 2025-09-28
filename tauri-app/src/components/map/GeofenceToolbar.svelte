<script>
  export let geofences = [];
  export let onGeofenceCreate = () => {};
  export let onGeofenceUpdate = () => {};
  export let onGeofenceDelete = () => {};
  export let onGeofenceSelect = () => {};
  export let selectedGeofence = null;
  export let isDrawing = false;
  export let onDrawingToggle = () => {};

  let dialogOpen = false;
  let expanded = false;
  let editingGeofence = null;
  let wasExpandedBeforeDrawing = false;
  let formData = {
    name: '',
    type: 'polygon',
    radius: 1000
  };

  function handleAddGeofence() {
    editingGeofence = null;
    formData = {
      name: '',
      type: 'polygon',
      radius: 1000
    };
    dialogOpen = true;
  }

  function handleEditGeofence(geofence) {
    editingGeofence = geofence;
    formData = {
      name: geofence.name,
      type: geofence.type,
      radius: geofence.radius || 1000
    };
    dialogOpen = true;
  }

  function handleSaveGeofence() {
    if (formData.name.trim() === '') return;

    const geofenceData = {
      name: formData.name.trim(),
      type: formData.type,
      coordinates: editingGeofence && editingGeofence.coordinates ? editingGeofence.coordinates : [],
      radius: formData.type === 'circle' ? formData.radius : undefined,
      color: '#1890ff20',
      strokeColor: '#1890ff',
      strokeWeight: 2
    };

    if (editingGeofence) {
      onGeofenceUpdate?.(editingGeofence.id, geofenceData);
    } else {
      onGeofenceCreate?.(geofenceData);
    }

    dialogOpen = false;
    editingGeofence = null;
  }

  function handleDeleteGeofence(id) {
    onGeofenceDelete?.(id);
    if (selectedGeofence && selectedGeofence.id === id) {
      onGeofenceSelect?.(null);
    }
  }

  function handleDrawingToggle() {
    if (!selectedGeofence) {
      dialogOpen = true;
      return;
    }

    const newDrawingState = !isDrawing;

    // 开始绘制时保存当前展开状态并折叠工具栏
    if (newDrawingState) {
      wasExpandedBeforeDrawing = expanded;
      expanded = false;
    } else {
      // 结束绘制时恢复之前的展开状态
      expanded = wasExpandedBeforeDrawing;
    }

    onDrawingToggle?.(newDrawingState);
  }

  function toggleExpanded() {
    // 如果正在绘制中，不允许展开工具栏
    if (isDrawing) return;
    expanded = !expanded;
  }

  function closeDialog() {
    dialogOpen = false;
    editingGeofence = null;
  }

  function handleOverlayKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      closeDialog();
    }
  }

  function handleDialogKeyDown(event) {
    if (event.key === 'Escape') {
      closeDialog();
    }
  }
</script>

<div
  class="geofence-toolbar"
  class:expanded={expanded}
  class:drawing={isDrawing}
>
  <!-- 折叠状态 - 仅显示图标 -->
  <div class="toolbar-header">
    <button
      class="toggle-button"
      class:drawing={isDrawing}
      onclick={toggleExpanded}
      disabled={isDrawing}
      aria-label={expanded ? '折叠工具栏' : '展开工具栏'}
    >
      <span class="fence-icon">🚧</span>
      {#if isDrawing}
        <div class="drawing-indicator"></div>
      {/if}
    </button>
  </div>

  <!-- 展开状态 - 显示完整工具栏 -->
  {#if expanded}
    <div class="toolbar-content">
      <div class="toolbar-header-expanded">
        <h3>地理围栏</h3>
        <button class="add-button" onclick={handleAddGeofence}>
          <span class="icon">+</span>
          新建
        </button>
      </div>

      <div class="drawing-control">
        <label class="switch-label">
          <input
            type="checkbox"
            class="switch-input"
            checked={isDrawing}
            onchange={handleDrawingToggle}
            disabled={!selectedGeofence}
          />
          <span class="switch-slider"></span>
          <span class="switch-text">
            {isDrawing ? '绘制中（工具栏已折叠）...' : '开始绘制'}
          </span>
        </label>
        <p class="drawing-hint">
          {!selectedGeofence
            ? '请先选择或创建一个围栏'
            : isDrawing
              ? '点击地图绘制围栏区域，双击完成绘制'
              : '点击开始在地图上绘制围栏区域'}
        </p>
      </div>

      <div class="geofence-list">
        <h4>围栏列表 ({geofences.length})</h4>
        {#if geofences.length === 0}
          <p class="empty-message">暂无地理围栏</p>
        {:else}
          {#each geofences as geofence}
            <div
              class="geofence-item"
              class:selected={selectedGeofence?.id === geofence.id}
              onclick={() =>
                onGeofenceSelect?.(
                  selectedGeofence?.id === geofence.id ? null : geofence
                )
              }
            >
              <div class="geofence-info">
                <div class="geofence-name">{geofence.name}</div>
                <div class="geofence-details">
                  <span class="geofence-type">
                    {geofence.type === 'circle' ? '圆形' : '多边形'}
                  </span>
                  {#if geofence.type === 'circle'}
                    <span class="geofence-radius">
                      半径: {geofence.radius}m
                    </span>
                  {/if}
                </div>
              </div>
              <div class="geofence-actions">
                <button
                  class="action-button edit"
                  onclick={(e) => {
                    e.stopPropagation();
                    handleEditGeofence(geofence);
                  }}
                  aria-label="编辑围栏"
                >
                  ✏️
                </button>
                <button
                  class="action-button delete"
                  onclick={(e) => {
                    e.stopPropagation();
                    handleDeleteGeofence(geofence.id);
                  }}
                  aria-label="删除围栏"
                >
                  🗑️
                </button>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}

  <!-- 对话框 -->
  {#if dialogOpen}
    <div
      class="dialog-overlay"
      role="button"
      tabindex="0"
      onclick={closeDialog}
      onkeydown={handleOverlayKeyDown}
      aria-label="关闭对话框"
    >
      <div
        class="dialog"
        role="dialog"
        aria-labelledby="dialog-title"
        aria-modal="true"
        tabindex="0"
        onclick={(e) => e.stopPropagation()}
        onkeydown={handleDialogKeyDown}
      >
        <div class="dialog-header">
          <h3 id="dialog-title">
            {editingGeofence ? '编辑地理围栏' : '新建地理围栏'}
          </h3>
          <button class="close-button" onclick={closeDialog} aria-label="关闭">
            ×
          </button>
        </div>

        <div class="dialog-content">
          <div class="form-group">
            <label for="geofence-name">围栏名称 *</label>
            <input
              id="geofence-name"
              type="text"
              bind:value={formData.name}
              placeholder="请输入围栏名称"
              required
            />
          </div>

          <div class="form-group">
            <label for="geofence-type">围栏类型</label>
            <select id="geofence-type" bind:value={formData.type}>
              <option value="polygon">多边形</option>
              <option value="circle">圆形</option>
            </select>
          </div>

          {#if formData.type === 'circle'}
            <div class="form-group">
              <label for="geofence-radius">半径（米）</label>
              <input
                id="geofence-radius"
                type="number"
                bind:value={formData.radius}
                min="10"
                max="10000"
                step="10"
              />
            </div>
          {/if}
        </div>

        <div class="dialog-actions">
          <button class="cancel-button" onclick={closeDialog}>取消</button>
          <button
            class="confirm-button"
            onclick={handleSaveGeofence}
            disabled={formData.name.trim() === ''}
          >
            {editingGeofence ? '更新' : '创建'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .geofence-toolbar {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 1000;
    padding: 0;
    min-width: 36px;
    max-height: 36px;
    overflow: hidden;
    transition: all 0.3s ease;
    background-color: transparent;
    border-radius: 4px;
  }

  .geofence-toolbar.expanded {
    padding: 8px;
    min-width: 260px;
    max-height: 400px;
    overflow: auto;
    background-color: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .geofence-toolbar.drawing {
    background-color: rgba(255, 193, 7, 0.9);
  }

  .toolbar-header {
    display: flex;
    align-items: center;
  }

  .toggle-button {
    width: 36px;
    height: 36px;
    min-width: 36px;
    background-color: rgba(255, 255, 255, 0.9);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    position: relative;
  }

  .toggle-button:hover:not(:disabled) {
    background-color: rgba(255, 255, 255, 0.95);
  }

  .toggle-button:disabled {
    background-color: rgba(255, 193, 7, 0.8);
    cursor: not-allowed;
  }

  .toggle-button.drawing {
    background-color: rgba(255, 193, 7, 0.9);
  }

  .toggle-button.drawing:hover {
    background-color: rgba(255, 193, 7, 0.95);
  }

  .fence-icon {
    font-size: 16px;
  }

  .drawing-indicator {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #ff9800;
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .toolbar-content {
    margin-top: 8px;
  }

  .toolbar-header-expanded {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .toolbar-header-expanded h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }

  .add-button {
    background-color: #1976d2;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    transition: background-color 0.2s ease;
  }

  .add-button:hover {
    background-color: #1565c0;
  }

  .add-button .icon {
    font-size: 14px;
    font-weight: bold;
  }

  .drawing-control {
    margin-bottom: 16px;
  }

  .switch-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    margin-bottom: 8px;
  }

  .switch-input {
    display: none;
  }

  .switch-slider {
    position: relative;
    width: 40px;
    height: 20px;
    background-color: #ccc;
    border-radius: 20px;
    transition: background-color 0.2s ease;
  }

  .switch-slider::before {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    background-color: white;
    border-radius: 50%;
    transition: transform 0.2s ease;
  }

  .switch-input:checked + .switch-slider {
    background-color: #1976d2;
  }

  .switch-input:checked + .switch-slider::before {
    transform: translateX(20px);
  }

  .switch-input:disabled + .switch-slider {
    background-color: #e0e0e0;
    cursor: not-allowed;
  }

  .switch-text {
    font-size: 14px;
    color: #333;
  }

  .drawing-hint {
    margin: 0;
    font-size: 12px;
    color: #666;
    line-height: 1.4;
  }

  .geofence-list h4 {
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 600;
    color: #333;
  }

  .empty-message {
    margin: 0;
    font-size: 14px;
    color: #666;
    text-align: center;
    padding: 16px;
  }

  .geofence-item {
    padding: 8px;
    margin-bottom: 6px;
    background-color: white;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .geofence-item:hover {
    background-color: #f5f5f5;
  }

  .geofence-item.selected {
    background-color: #e3f2fd;
    border-color: #2196f3;
  }

  .geofence-info {
    flex: 1;
  }

  .geofence-name {
    font-size: 14px;
    font-weight: 500;
    color: #333;
    margin-bottom: 4px;
  }

  .geofence-details {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .geofence-type,
  .geofence-radius {
    font-size: 12px;
    color: #666;
    padding: 2px 6px;
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    background-color: white;
  }

  .geofence-actions {
    display: flex;
    gap: 4px;
  }

  .action-button {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    border-radius: 4px;
    transition: background-color 0.2s ease;
  }

  .action-button:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }

  .action-button.edit:hover {
    background-color: rgba(33, 150, 243, 0.1);
  }

  .action-button.delete:hover {
    background-color: rgba(244, 67, 54, 0.1);
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
    z-index: 2000;
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

  .close-button {
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

  .close-button:hover {
    color: #333;
  }

  .dialog-content {
    padding: 24px;
    max-height: 60vh;
    overflow-y: auto;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    margin-bottom: 16px;
  }

  .form-group label {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 4px;
    color: #333;
  }

  .form-group input,
  .form-group select {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    transition: border-color 0.2s ease;
  }

  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: #1976d2;
  }

  .dialog-actions {
    padding: 16px 24px;
    border-top: 1px solid #e0e0e0;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .cancel-button {
    background: none;
    border: 1px solid #ddd;
    color: #666;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
  }

  .cancel-button:hover {
    background-color: #f5f5f5;
  }

  .confirm-button {
    background: #1976d2;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s ease;
  }

  .confirm-button:hover:not(:disabled) {
    background: #1565c0;
  }

  .confirm-button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
</style>
