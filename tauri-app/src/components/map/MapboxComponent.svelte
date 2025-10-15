<script>
    import { onMount, afterUpdate } from "svelte";
    import mapboxgl from "mapbox-gl";
    import "mapbox-gl/dist/mapbox-gl.css";

    export let devices = [];
    export let onMarkerClick = () => {};
    export const onGeofenceViolation = () => {};
    export let height = "400px";
    export let accessToken =
        "pk.eyJ1Ijoic2FtbGVhcm5lciIsImEiOiJja2IzNTFsZXMwaG44MzRsbWplbGNtNHo0In0.BmjC6OX6egwKdm0fAmN_Nw";

    let mapElement;
    let mapInstance = null;
    let mapLoaded = false;
    let markers = [];
    let popup = null;

    // 初始化地图
    function initMap() {
        if (!mapElement || mapInstance) return;

        mapboxgl.accessToken = accessToken;

        mapInstance = new mapboxgl.Map({
            container: mapElement,
            style: "mapbox://styles/mapbox/streets-v12",
            center: [116.3974, 39.9093], // 默认北京
            zoom: 12,
            attributionControl: false,
        });

        mapInstance.on("load", () => {
            mapLoaded = true;
            renderMarkers();
        });

        // 添加缩放和旋转控件
        mapInstance.addControl(new mapboxgl.NavigationControl(), "top-right");

        // 添加比例尺
        mapInstance.addControl(
            new mapboxgl.ScaleControl({
                maxWidth: 100,
                unit: "metric",
            }),
            "bottom-left",
        );
    }

    // 渲染设备标记
    function renderMarkers() {
        if (!mapInstance || !mapLoaded) return;

        // 清除旧标记
        markers.forEach((marker) => marker.remove());
        markers = [];

        devices.forEach((device) => {
            if (device.longitude && device.latitude) {
                // 创建标记元素
                const el = document.createElement("div");
                el.className = "device-marker";
                el.style.width = "16px";
                el.style.height = "16px";
                el.style.borderRadius = "50%";
                el.style.backgroundColor = getStatusColor(device.status);
                el.style.border = "3px solid white";
                el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
                el.style.cursor = "pointer";
                el.style.display = "flex";
                el.style.alignItems = "center";
                el.style.justifyContent = "center";
                el.style.fontSize = "10px";
                el.style.fontWeight = "bold";
                el.style.color = "white";

                // 添加点击事件
                el.addEventListener("click", (e) => {
                    e.stopPropagation();
                    onMarkerClick(device);
                });

                // 创建标记
                const marker = new mapboxgl.Marker({
                    element: el,
                    anchor: "center",
                })
                    .setLngLat([device.longitude, device.latitude])
                    .setPopup(
                        new mapboxgl.Popup({ offset: 25 }).setHTML(`
                            <div class="device-popup">
                                <h4>${device.name}</h4>
                                <p>状态: ${getStatusText(device.status)}</p>
                                <p>坐标: ${Number(device.longitude).toFixed(6)}, ${Number(device.latitude).toFixed(6)}</p>
                                ${device.address ? `<p>地址: ${device.address}</p>` : ""}
                            </div>
                        `),
                    )
                    .addTo(mapInstance);

                markers.push(marker);
            }
        });
    }

    // 导航到设备位置
    function navigateToDevice(device) {
        if (mapInstance && device.longitude && device.latitude) {
            mapInstance.flyTo({
                center: [device.longitude, device.latitude],
                zoom: 16,
                essential: true,
            });
        }
    }

    // 获取状态颜色
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

    // 获取状态文本
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

    // 添加地理围栏
    function addGeofence(points) {
        if (!mapInstance || !mapLoaded) return;

        // 这里可以添加地理围栏功能
        console.log("添加地理围栏:", points);
    }

    // 移除地理围栏
    function removeGeofence(id) {
        console.log("移除地理围栏:", id);
    }

    // 清除所有地理围栏
    function clearGeofences() {
        console.log("清除所有地理围栏");
    }

    onMount(() => {
        initMap();

        // 暴露方法给父组件
        if (mapElement) {
            mapElement.navigateToDevice = navigateToDevice;
            mapElement.addGeofence = addGeofence;
            mapElement.removeGeofence = removeGeofence;
            mapElement.clearGeofences = clearGeofences;
        }

        return () => {
            if (mapInstance) {
                mapInstance.remove();
                mapInstance = null;
            }
        };
    });

    afterUpdate(() => {
        if (mapLoaded) {
            renderMarkers();
        }
    });
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

    /* Mapbox 样式覆盖 */
    :global(.mapboxgl-popup-content) {
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    :global(.mapboxgl-popup-close-button) {
        font-size: 16px;
        padding: 4px 8px;
    }

    :global(.mapboxgl-ctrl-group) {
        border-radius: 8px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    }
</style>
