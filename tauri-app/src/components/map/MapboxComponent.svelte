<script>
    import { onMount, afterUpdate } from "svelte";
    import mapboxgl from "mapbox-gl";
    import "mapbox-gl/dist/mapbox-gl.css";

    export let devices = [];
    export let onMarkerClick = () => {};
    export let height = "400px";
    export let accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    const IMG_BASE_URL =
        import.meta.env.VITE_IMG_BASE_URL || "http://localhost:8080";

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
    let historyTrackLayerId = "history-track";
    let historyTrackSourceId = "history-track";
    let historyPointsLayerId = "history-points";
    let historyPointsSourceId = "history-points";

    // 导航状态事件
    export let onNavigationStart = () => {};
    export let onNavigationEnd = () => {};
    export let onNavigationError = () => {};

    // 获取当前位置
    async function getCurrentLocation() {
        // 首先尝试浏览器定位
        try {
            return await new Promise((resolve, reject) => {
                if (!navigator.geolocation) {
                    reject(new Error("浏览器不支持地理位置服务"));
                    return;
                }

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        currentLocation = {
                            longitude: position.coords.longitude,
                            latitude: position.coords.latitude,
                            accuracy: position.coords.accuracy,
                            source: "browser",
                        };
                        console.log("MapboxComponent: 浏览器定位成功");
                        resolve(currentLocation);
                    },
                    (error) => {
                        console.warn(
                            "MapboxComponent: 浏览器定位失败:",
                            error.message,
                        );
                        reject(error);
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 60000,
                    },
                );
            });
        } catch (error) {
            // 浏览器定位失败，使用IP定位作为备用方案
            console.log("MapboxComponent: 尝试IP定位作为备用方案");
            try {
                const response = await fetch("https://ipapi.co/json/");
                const data = await response.json();

                currentLocation = {
                    longitude: data.longitude,
                    latitude: data.latitude,
                    city: data.city,
                    country: data.country_name,
                    source: "ip",
                };
                console.log("MapboxComponent: IP定位成功");
                return currentLocation;
            } catch (ipError) {
                console.error("MapboxComponent: IP定位也失败:", ipError);
                throw new Error("无法获取当前位置，请检查网络连接");
            }
        }
    }

    // 计算路线
    async function calculateRoute(destination) {
        if (!currentLocation) {
            await getCurrentLocation();
        }

        // 即使使用IP定位，也计算完整路线
        if (currentLocation.source === "ip") {
            console.log("使用IP定位，计算完整路线");
        }

        const origin = [currentLocation.longitude, currentLocation.latitude];
        const dest = [destination.longitude, destination.latitude];

        console.log("开始计算路线:", {
            origin,
            destination: dest,
            accessToken: accessToken ? "已设置" : "未设置",
        });

        try {
            const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin[0]},${origin[1]};${dest[0]},${dest[1]}?geometries=geojson&access_token=${accessToken}`;
            console.log("Mapbox API URL:", url);

            const response = await fetch(url);

            if (!response.ok) {
                console.error("Mapbox API 响应错误:", {
                    status: response.status,
                    statusText: response.statusText,
                    url: url,
                });
                throw new Error(
                    `Mapbox API 错误: ${response.status} ${response.statusText}`,
                );
            }

            const data = await response.json();
            console.log("Mapbox API 响应:", data);

            if (data.routes && data.routes.length > 0) {
                console.log("路线计算成功，找到路线:", data.routes[0].geometry);
                return data.routes[0].geometry;
            } else {
                console.error("Mapbox API 返回无路线:", data);
                throw new Error(
                    "无法计算路线: " + (data.message || "未知错误"),
                );
            }
        } catch (error) {
            console.error("路线计算失败:", {
                error: error.message,
                origin,
                destination: dest,
                stack: error.stack,
            });

            // 路线计算失败时，返回直线路径作为备用方案
            console.log("路线计算失败，使用直线路径作为备用方案");
            return {
                type: "LineString",
                coordinates: [
                    [currentLocation.longitude, currentLocation.latitude],
                    [destination.longitude, destination.latitude],
                ],
            };
        }
    }

    // 显示路线
    function showRoute(geometry) {
        console.log("显示路线:", geometry);

        if (!mapInstance) {
            console.error("无法显示路线: mapInstance 未初始化");
            return;
        }

        // 检查是否已存在路线图层
        if (mapInstance.getLayer(routeLayerId)) {
            console.log("移除现有路线图层");
            mapInstance.removeLayer(routeLayerId);
        }
        if (mapInstance.getSource(routeSourceId)) {
            console.log("移除现有路线源");
            mapInstance.removeSource(routeSourceId);
        }

        try {
            // 添加路线源
            console.log("添加路线源...");
            mapInstance.addSource(routeSourceId, {
                type: "geojson",
                data: {
                    type: "Feature",
                    geometry: geometry,
                    properties: {},
                },
            });

            // 添加路线图层
            console.log("添加路线图层...");
            mapInstance.addLayer({
                id: routeLayerId,
                type: "line",
                source: routeSourceId,
                layout: {
                    "line-join": "round",
                    "line-cap": "round",
                },
                paint: {
                    "line-color": "#007cbf",
                    "line-width": 4,
                    "line-opacity": 0.8,
                },
            });

            console.log("路线显示完成");
        } catch (error) {
            console.error("显示路线失败:", {
                error: error.message,
                geometry: geometry,
                stack: error.stack,
            });
        }

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
                id: "origin-layer",
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
        console.log("开始导航到设备:", device);

        if (!mapInstance) {
            console.error("导航失败: mapInstance 未初始化");
            return;
        }

        if (!device.longitude || !device.latitude) {
            console.error("导航失败: 设备坐标无效", {
                longitude: device.longitude,
                latitude: device.latitude,
            });
            return;
        }

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
            console.log("获取当前位置...");
            await getCurrentLocation();
            console.log("当前位置:", currentLocation);

            console.log("计算路线...");
            const routeGeometry = await calculateRoute(device);

            console.log("显示路线...");
            // 显示路线
            showRoute(routeGeometry);

            const destination = [device.longitude, device.latitude];
            const origin = [
                currentLocation.longitude,
                currentLocation.latitude,
            ];

            console.log("导航参数:", {
                origin,
                destination,
                distance: calculateDistance(origin, destination),
            });

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
            console.log("执行地图动画...");
            mapInstance.fitBounds(bounds, {
                padding: 50,
                duration: 2000,
                essential: true,
            });

            // 监听动画完成事件
            mapInstance.once("moveend", () => {
                console.log("地图动画完成");
                isNavigating = false;
                onNavigationEnd();
            });

            // 后备超时（防止moveend事件未触发）
            const navigationTimeout = setTimeout(() => {
                console.log("导航超时完成");
                isNavigating = false;
                onNavigationEnd();
            }, 4000);

            // 存储超时ID以便清理
            if (mapElement) {
                mapElement.navigationTimeout = navigationTimeout;
            }

            console.log("导航流程完成");
        } catch (error) {
            console.error("导航失败:", {
                error: error.message,
                device: device,
                currentLocation: currentLocation,
                stack: error.stack,
            });

            // 如果路线计算失败，使用简单的flyTo直接飞到设备位置
            console.log("使用备用导航方案 (flyTo)...");
            const destination = [device.longitude, device.latitude];

            try {
                // 清除之前的导航标记
                clearRoute();
                if (navigationMarker) {
                    navigationMarker.remove();
                    navigationMarker = null;
                }

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
                console.log("执行地图动画...");
                mapInstance.fitBounds(bounds, {
                    padding: 50,
                    duration: 2000,
                    essential: true,
                });

                // 监听动画完成事件
                mapInstance.once("moveend", () => {
                    console.log("地图动画完成");
                    isNavigating = false;
                    onNavigationEnd();
                });

                // 后备超时（防止moveend事件未触发）
                const navigationTimeout = setTimeout(() => {
                    console.log("导航超时完成");
                    isNavigating = false;
                    onNavigationEnd();
                }, 4000);

                // 存储超时ID以便清理
                if (mapElement) {
                    mapElement.navigationTimeout = navigationTimeout;
                }

                console.log("导航流程完成");
            } catch (error) {
                console.error("导航失败:", {
                    error: error.message,
                    device: device,
                    currentLocation: currentLocation,
                    stack: error.stack,
                });

                // 如果路线计算失败，使用简单的flyTo直接飞到设备位置
                console.log("使用备用导航方案 (flyTo)...");
                const destination = [device.longitude, device.latitude];

                try {
                    // 清除之前的导航标记
                    clearRoute();
                    if (navigationMarker) {
                        navigationMarker.remove();
                        navigationMarker = null;
                    }

                    mapInstance.flyTo({
                        center: destination,
                        zoom: 14,
                        duration: 2000,
                    });

                    isNavigating = false;
                    onNavigationEnd();
                    // 触发错误回调，提供更友好的错误信息
                    if (onNavigationError) {
                        onNavigationError("导航失败，请稍后重试");
                    }
                } catch (flyToError) {
                    console.error("备用导航方案也失败:", flyToError);
                    isNavigating = false;
                    onNavigationEnd();
                    if (onNavigationError) {
                        onNavigationError("导航失败，请稍后重试");
                    }
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
            // 自动调整视角到所有标记位置
            if (devices.length > 0) {
                fitToMarkers();
            }
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
                        // 如果有设备组图标，更新图标和边框颜色
                        if (device.device_group?.icon_url) {
                            el.style.borderColor = getStatusColor(
                                device.status,
                            );
                            // 如果有图片，更新图片源
                            const img = el.querySelector("img");
                            if (img) {
                                img.src = `${IMG_BASE_URL}${device.device_group.icon_url}`;
                                img.alt = device.device_group.name;
                            }
                        } else {
                            el.style.backgroundColor = getStatusColor(
                                device.status,
                            );
                        }
                    }
                    markers.push(existingMarker);
                } else {
                    // 创建新标记
                    const el = document.createElement("div");
                    el.className = "device-marker";

                    // 如果有设备组图标，使用图标
                    if (device.device_group?.icon_url) {
                        el.style.width = "26px";
                        el.style.height = "26px";
                        el.style.borderRadius = "50%";
                        // el.style.border = `3px solid ${getStatusColor(device.status)}`;
                        // el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
                        el.style.cursor = "pointer";
                        el.style.display = "flex";
                        el.style.alignItems = "center";
                        el.style.justifyContent = "center";
                        // el.style.backgroundColor = "white";
                        el.style.overflow = "hidden";

                        const img = document.createElement("img");
                        img.src = `${IMG_BASE_URL}${device.device_group.icon_url}`;
                        img.alt = device.device_group.name;
                        img.style.width = "20px";
                        img.style.height = "20px";
                        img.style.objectFit = "contain";
                        el.appendChild(img);
                    } else {
                        // 如果没有图标，使用原来的样式
                        el.style.width = "16px";
                        el.style.height = "16px";
                        el.style.borderRadius = "50%";
                        el.style.backgroundColor = getStatusColor(
                            device.status,
                        );
                        el.style.border = "3px solid white";
                        el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
                        el.style.cursor = "pointer";
                        el.style.display = "flex";
                        el.style.alignItems = "center";
                        el.style.justifyContent = "center";
                        el.style.fontSize = "10px";
                        el.style.fontWeight = "bold";
                        el.style.color = "white";

                        const text = document.createTextNode(
                            device.name.charAt(0).toUpperCase(),
                        );
                        el.appendChild(text);
                    }

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
                            new mapboxgl.Popup({ offset: 25 }).setHTML(
                                '<div class="device-popup">' +
                                    "<h4>" +
                                    device.name +
                                    "</h4>" +
                                    "<p>状态: " +
                                    getStatusText(device.status) +
                                    "</p>" +
                                    "<p>坐标: " +
                                    Number(device.longitude).toFixed(6) +
                                    ", " +
                                    Number(device.latitude).toFixed(6) +
                                    "</p>" +
                                    (device.address
                                        ? "<p>地址: " + device.address + "</p>"
                                        : "") +
                                    "</div>",
                            ),
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

    // 自动调整视角到所有标记位置
    function fitToMarkers() {
        if (!mapInstance || !mapLoaded || devices.length === 0) return;

        const bounds = new mapboxgl.LngLatBounds();

        // 遍历所有设备，扩展边界
        devices.forEach((device) => {
            if (device.longitude && device.latitude) {
                bounds.extend([device.longitude, device.latitude]);
            }
        });

        // 如果没有任何有效坐标，直接返回
        if (bounds.isEmpty()) return;

        // 调整地图视角
        mapInstance.fitBounds(bounds, {
            padding: 50, // 边距
            duration: 1000, // 1秒动画
            maxZoom: 15, // 最大缩放级别
        });
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

    // 显示历史轨迹
    export function showHistoryTrack(coordinates) {
        if (!mapInstance || coordinates.length < 2) return;

        // 清除现有历史轨迹
        clearHistoryTrack();

        // 检查坐标格式
        const validCoordinates = coordinates.filter(
            (coord) =>
                Array.isArray(coord) &&
                coord.length === 2 &&
                typeof coord[0] === "number" &&
                typeof coord[1] === "number" &&
                !isNaN(coord[0]) &&
                !isNaN(coord[1]),
        );

        if (validCoordinates.length < 2) return;

        // 创建轨迹线
        const lineString = {
            type: "Feature",
            properties: {},
            geometry: {
                type: "LineString",
                coordinates: validCoordinates,
            },
        };

        // 创建轨迹点集合
        const points = {
            type: "FeatureCollection",
            features: validCoordinates.map((coord, index) => ({
                type: "Feature",
                properties: { index },
                geometry: {
                    type: "Point",
                    coordinates: coord,
                },
            })),
        };

        // 添加轨迹源
        mapInstance.addSource(historyTrackSourceId, {
            type: "geojson",
            data: lineString,
        });

        // 添加轨迹点源
        mapInstance.addSource(historyPointsSourceId, {
            type: "geojson",
            data: points,
        });

        // 添加轨迹图层
        mapInstance.addLayer({
            id: historyTrackLayerId,
            type: "line",
            source: historyTrackSourceId,
            layout: {
                "line-join": "round",
                "line-cap": "round",
            },
            paint: {
                "line-color": "#ff6b35",
                "line-width": 6,
                "line-opacity": 0.9,
            },
        });

        // 添加轨迹点图层（绿色小圆点）
        mapInstance.addLayer({
            id: historyPointsLayerId,
            type: "circle",
            source: historyPointsSourceId,
            paint: {
                "circle-radius": 6,
                "circle-color": "#22c55e",
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff",
                "circle-opacity": 0.9,
            },
        });

        // 调整视角显示整个轨迹
        const bounds = new mapboxgl.LngLatBounds();
        coordinates.forEach((coord) => bounds.extend(coord));

        if (!bounds.isEmpty()) {
            mapInstance.fitBounds(bounds, {
                padding: 50,
                duration: 1500,
                maxZoom: 16,
            });
        }
    }

    // 清除历史轨迹
    export function clearHistoryTrack() {
        if (!mapInstance) return;

        if (mapInstance.getLayer(historyTrackLayerId)) {
            mapInstance.removeLayer(historyTrackLayerId);
        }

        if (mapInstance.getSource(historyTrackSourceId)) {
            mapInstance.removeSource(historyTrackSourceId);
        }

        if (mapInstance.getLayer(historyPointsLayerId)) {
            mapInstance.removeLayer(historyPointsLayerId);
        }

        if (mapInstance.getSource(historyPointsSourceId)) {
            mapInstance.removeSource(historyPointsSourceId);
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
            if (navigationLine) {
                if (mapInstance.getSource("navigation-line")) {
                    mapInstance.removeLayer("navigation-line");
                    mapInstance.removeSource("navigation-line");
                }
                navigationLine = null;
            }

            // 清除路线
            clearRoute();

            // 清除历史轨迹
            clearHistoryTrack();

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
                previousDevicesHash = currentDevicesHash;

                // 使用 requestAnimationFrame 来避免频繁更新
                requestAnimationFrame(() => {
                    renderMarkers();
                    // 重新调整视角到标记位置
                    if (devices.length > 0) {
                        fitToMarkers();
                    }
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
