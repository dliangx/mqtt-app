<script>
    export let devices = [];
    export let onMarkerClick = () => {};
    export let onGeofenceViolation = () => {};
    export let height = "400px";

    let mapElement;
    let mapLoaded = false;
    let mapInstance = null;
    let markers = [];

    function loadAMapScript(callback) {
        if (window.AMap) {
            callback();
            return;
        }
        const script = document.createElement("script");
        script.src =
            "https://webapi.amap.com/maps?v=2.0&key=50ca703c5d6a86fdf2e727181a3fc2c6";
        script.async = true;
        script.onload = callback;
        document.body.appendChild(script);
    }

    function renderMarkers() {
        if (!mapInstance || !devices) return;
        // 清除旧标记
        markers.forEach((m) => m.setMap(null));
        markers = [];
        devices.forEach((device) => {
            if (device.longitude && device.latitude) {
                const marker = new window.AMap.Marker({
                    position: [device.longitude, device.latitude],
                    title: device.name,
                });
                marker.setMap(mapInstance);
                marker.on("click", () => onMarkerClick(device));
                markers.push(marker);
            }
        });
    }

    import { onMount, afterUpdate } from "svelte";
    onMount(() => {
        loadAMapScript(() => {
            mapInstance = new window.AMap.Map(mapElement, {
                zoom: 12,
                center:
                    devices.length > 0 &&
                    devices[0].longitude &&
                    devices[0].latitude
                        ? [devices[0].longitude, devices[0].latitude]
                        : [116.3974, 39.9093], // 默认北京
            });
            renderMarkers();
            mapLoaded = true;
        });
    });

    afterUpdate(() => {
        if (mapInstance) {
            renderMarkers();
        }
    });

    function navigateToDevice(device) {
        if (mapInstance && device.longitude && device.latitude) {
            mapInstance.setCenter([device.longitude, device.latitude]);
            mapInstance.setZoom(16);
        }
    }

    // 占位方法，后续可扩展
    function addGeofence(points) {}
    function removeGeofence(id) {}
    function clearGeofences() {}

    // Expose methods to parent component
    onMount(() => {
        if (mapElement) {
            mapElement.navigateToDevice = navigateToDevice;
            mapElement.addGeofence = addGeofence;
            mapElement.removeGeofence = removeGeofence;
            mapElement.clearGeofences = clearGeofences;
        }
    });

    function handleDeviceClick(device) {
        onMarkerClick?.(device);
    }

    function handleDeviceKeyDown(event, device) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleDeviceClick(device);
        }
    }
</script>

<div class="map-container" bind:this={mapElement} style="height: {height}">
    {#if !mapLoaded}
        <div class="map-loading">
            <div class="loading-content">
                <div class="loading-spinner">🗺️</div>
                <p>地图加载中...</p>
                <p class="device-count">设备数量: {devices.length}</p>
            </div>
        </div>
    {/if}
</div>

<style>
    .map-container {
        position: relative;
        width: 100%;
        background: #f0f0f0;
        border-radius: 8px;
        overflow: hidden;
    }

    .map-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
    }

    .loading-content {
        text-align: center;
    }

    .loading-spinner {
        font-size: 48px;
        margin-bottom: 16px;
        animation: spin 2s linear infinite;
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    .device-count {
        font-size: 14px;
        opacity: 0.8;
        margin-top: 8px;
    }

    .map-placeholder {
        height: 100%;
        background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
    }

    .map-overlay {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        padding: 24px;
        border-radius: 12px;
        text-align: center;
        max-width: 80%;
    }

    .map-overlay h3 {
        margin: 0 0 12px 0;
        font-size: 20px;
        font-weight: 600;
    }

    .map-overlay p {
        margin: 8px 0;
        opacity: 0.9;
    }

    .devices-list {
        margin-top: 20px;
        text-align: left;
    }

    .devices-list h4 {
        margin: 0 0 12px 0;
        font-size: 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.3);
        padding-bottom: 8px;
    }

    .device-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 12px;
        margin-bottom: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        cursor: pointer;
        transition: background-color 0.2s ease;
        border: none;
        color: inherit;
        font: inherit;
        width: 100%;
        text-align: left;
    }

    .device-item:hover {
        background: rgba(255, 255, 255, 0.2);
    }

    .device-item:focus {
        outline: 2px solid rgba(255, 255, 255, 0.5);
        outline-offset: 2px;
    }

    .device-name {
        font-weight: 500;
        flex: 1;
    }

    .device-status {
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
    }

    .device-status.online {
        background: #00b894;
    }

    .device-status.offline {
        background: #636e72;
    }

    .device-status.warning {
        background: #fdcb6e;
        color: #2d3436;
    }

    .device-coords {
        font-size: 11px;
        opacity: 0.7;
        font-family: monospace;
    }
</style>
