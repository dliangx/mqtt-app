<script>
    import { onMount, afterUpdate } from "svelte";
    import mapboxgl from "mapbox-gl";
    import "mapbox-gl/dist/mapbox-gl.css";

    export let devices = [];
    export let onMarkerClick = () => {};
    export let height = "400px";
    export let accessToken =
        "pk.eyJ1Ijoic2FtbGVhcm5lciIsImEiOiJja2IzNTFsZXMwaG44MzRsbWplbGNtNHo0In0.BmjC6OX6egwKdm0fAmN_Nw";

    // 路线导航相关状态
    let currentLocation = null;
    let routeLayerId = "route";
    let routeSourceId = "route";

    let mapElement;
    let mapInstance = null;
    let mapLoaded = false;
    let markers = [];
    let popup = null;
    let previousDevicesHash = "";
    let updateCount = 0;
    let isUpdating = false;
    let isNavigating = false;
    let navigationMarker = null;
    let navigationLine = null;

    // 导航状态事件
    export let onNavigationStart = () => {};
    export let onNavigationEnd = () => {};
    export let onNavigationError = () => {};

    // 获取当前位置
    function getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error("浏览器不支持地理位置服务"));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    currentLocation = {
                        longitude: position.coords.longitude,
                        latitude: position.coords.latitude,
                    };
                    resolve(currentLocation);
                },
                (error) => {
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000,
                },
            );
        });
    }

    // 计算路线
    async function calculateRoute(destination) {
        if (!currentLocation) {
            await getCurrentLocation();
        }

        const origin = [currentLocation.longitude, currentLocation.latitude];
        const dest = [destination.longitude, destination.latitude];

        try {
            const response = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/driving/${origin[0]},${origin[1]};${dest[0]},${dest[1]}?geometries=geojson&access_token=${accessToken}`,
            );
            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                return data.routes[0].geometry;
            } else {
                throw new Error("无法计算路线");
            }
        } catch (error) {
            console.error("路线计算失败:", error);
            throw error;
        }
    }

    // 显示路线
    function showRoute(geometry) {
        if (!mapInstance) return;

        // 移除现有路线
        if (mapInstance.getSource(routeSourceId)) {
            mapInstance.removeLayer(routeLayerId);
            mapInstance.removeSource(routeSourceId);
        }

        // 添加路线源
        mapInstance.addSource(routeSourceId, {
            type: "geojson",
            data: {
                type: "Feature",
                properties: {},
                geometry: geometry,
            },
        });

        // 添加路线图层
        mapInstance.addLayer({
            id: routeLayerId,
            type: "line",
            source: routeSourceId,
            layout: {
                "line-join": "round",
                "line-cap": "round",
            },
            paint: {
                "line-color": "#1976d2",
                "line-width": 5,
                "line-opacity": 0.8,
            },
        });

        // 添加起点标记
        if (!mapInstance.getSource("origin-marker")) {
            mapInstance.addSource("origin-marker", {
                type: "geojson",
                data: {
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: [
                            currentLocation.longitude,
                            currentLocation.latitude,
                        ],
                    },
                    properties: {},
                },
            });

            mapInstance.addLayer({
                id: "origin-marker",
                type: "circle",
                source: "origin-marker",
                paint: {
                    "circle-radius": 8,
                    "circle-color": "#4caf50",
                    "circle-stroke-width": 2,
                    "circle-stroke-color": "#ffffff",
                },
            });
        }
    }

    // 清除路线
    function clearRoute() {
        if (!mapInstance) return;

        if (mapInstance.getSource(routeSourceId)) {
            mapInstance.removeLayer(routeLayerId);
            mapInstance.removeSource(routeSourceId);
        }

        if (mapInstance.getSource("origin-marker")) {
            mapInstance.removeLayer("origin-marker");
            mapInstance.removeSource("origin-marker");
        }
    }

    // 暴露导航方法给父组件
    export async function navigateToDevice(device) {
        if (mapInstance && device.longitude && device.latitude) {
            isNavigating = true;
            onNavigationStart();

            try {
                // 清除之前的导航标记和路线
                clearRoute();
                if (navigationMarker) {
                    navigationMarker.remove();
                    navigationMarker = null;
                }

                // 获取当前位置并计算路线
                await getCurrentLocation();
                const routeGeometry = await calculateRoute(device);

                // 显示路线
                showRoute(routeGeometry);

                const destination = [device.longitude, device.latitude];
                const origin = [
                    currentLocation.longitude,
                    currentLocation.latitude,
                ];

                // 计算合适的缩放级别以显示整个路线
                const bounds = new mapboxgl.LngLatBounds();
                bounds.extend(origin);
                bounds.extend(destination);

                // 添加导航目标标记
                const navEl = document.createElement("div");
                navEl.className = "navigation-target";
                navEl.innerHTML = `
                    <div class="navigation-pulse"></div>
                    <div class="navigation-center"></div>
                `;

                navigationMarker = new mapboxgl.Marker({
                    element: navEl,
                    anchor: "center",
                })
                    .setLngLat(destination)
                    .addTo(mapInstance);

                // 使用fitBounds显示整个路线
                mapInstance.fitBounds(bounds, {
                    padding: 50,
                    duration: 2000,
                    essential: true,
                });

                // 监听动画完成事件
                mapInstance.once("moveend", () => {
                    isNavigating = false;
                    onNavigationEnd();
                });

                // 后备超时（防止moveend事件未触发）
                const navigationTimeout = setTimeout(() => {
                    isNavigating = false;
                    onNavigationEnd();
                }, 4000);

                // 存储超时ID以便清理
                if (mapElement) {
                    mapElement.navigationTimeout = navigationTimeout;
                }
            } catch (error) {
                console.error("导航失败:", error);
                // 如果路线计算失败，使用简单的flyTo
                const destination = [device.longitude, device.latitude];
                mapInstance.flyTo({
                    center: destination,
                    zoom: 14,
                    duration: 2000,
                });

                isNavigating = false;
                onNavigationEnd();
                // 触发错误回调
                if (onNavigationError) {
                    onNavigationError(error.message || "导航失败");
                }
            }
        }
    }

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

        // 创建设备ID到标记的映射
        const existingMarkers = new Map();
        markers.forEach((marker, index) => {
            const device = devices[index];
            if (device && device.id) {
                existingMarkers.set(device.id, marker);
            }
        });

        // 清除不再存在的标记
        markers.forEach((marker, index) => {
            const device = devices[index];
            if (!device || !device.id || !existingMarkers.has(device.id)) {
                marker.remove();
            }
        });

        // 重新创建标记数组
        markers = [];

        devices.forEach((device) => {
            if (device.longitude && device.latitude) {
                // 检查是否已存在该设备的标记
                const existingMarker = existingMarkers.get(device.id);
                if (existingMarker) {
                    // 更新现有标记的位置和样式
                    existingMarker.setLngLat([
                        device.longitude,
                        device.latitude,
                    ]);
                    const el = existingMarker.getElement();
                    if (el) {
                        el.style.backgroundColor = getStatusColor(
                            device.status,
                        );
                    }
                    markers.push(existingMarker);
                } else {
                    // 创建新标记
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
            }
        });
    }

    // 计算两点之间的距离（公里）
    function calculateDistance(lon1, lat1, lon2, lat2) {
        const R = 6371; // 地球半径（公里）
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // 根据距离计算最优缩放级别
    function calculateOptimalZoom(distance) {
        if (distance < 1) return 16; // 1公里内：详细视图
        if (distance < 5) return 14; // 5公里内：街道视图
        if (distance < 20) return 12; // 20公里内：区域视图
        if (distance < 100) return 10; // 100公里内：城市视图
        return 8; // 更远距离：省级视图
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

    onMount(() => {
        initMap();

        return () => {
            // 清理导航超时
            if (mapElement && mapElement.navigationTimeout) {
                clearTimeout(mapElement.navigationTimeout);
            }

            // 移除moveend事件监听器
            if (mapInstance) {
                mapInstance.off("moveend");
            }

            // 清理导航标记和路线
            if (navigationMarker) {
                navigationMarker.remove();
                navigationMarker = null;
            }

            // 清除路线
            clearRoute();

            // 重置导航状态
            if (isNavigating) {
                isNavigating = false;
                onNavigationEnd();
            }

            if (mapInstance) {
                mapInstance.remove();
                mapInstance = null;
            }
        };
    });

    afterUpdate(() => {
        if (mapLoaded && !isUpdating) {
            // 只有当设备数据实际发生变化时才重新渲染标记
            const currentDevicesHash = JSON.stringify(
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
                isUpdating = true;
                updateCount++;
                console.log(
                    `[MapboxComponent] 更新次数: ${updateCount}, 设备数量: ${devices.length}, 数据变化: true`,
                );
                previousDevicesHash = currentDevicesHash;
                console.log(`[MapboxComponent] 设备数据发生变化，重新渲染标记`);

                // 使用 requestAnimationFrame 来避免频繁更新
                requestAnimationFrame(() => {
                    renderMarkers();
                    isUpdating = false;
                });
            }
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

    /* 导航目标标记样式 */
    .navigation-target {
        position: relative;
        width: 40px;
        height: 40px;
        pointer-events: none;
    }

    .navigation-pulse {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 20px;
        height: 20px;
        background: #1976d2;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        animation: pulse 2s infinite;
        box-shadow: 0 0 0 rgba(25, 118, 210, 0.4);
    }

    .navigation-center {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 8px;
        height: 8px;
        background: white;
        border: 2px solid #1976d2;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        z-index: 1;
    }

    @keyframes pulse {
        0% {
            transform: translate(-50%, -50%) scale(0.8);
            box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.7);
        }
        70% {
            transform: translate(-50%, -50%) scale(1.2);
            box-shadow: 0 0 0 10px rgba(25, 118, 210, 0);
        }
        100% {
            transform: translate(-50%, -50%) scale(0.8);
            box-shadow: 0 0 0 0 rgba(25, 118, 210, 0);
        }
    }
</style>
