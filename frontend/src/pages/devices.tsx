import type { Device, DeviceGroup } from 'src/types';

import React, { useState, useEffect, useCallback } from 'react';

import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Category as CategoryIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import {
  Box,
  Tab,
  Chip,
  Tabs,
  Paper,
  Table,
  Button,
  Dialog,
  Tooltip,
  TableRow,
  MenuItem,
  TableBody,
  TableCell,
  TableHead,
  TextField,
  IconButton,
  Typography,
  DialogTitle,
  DialogActions,
  DialogContent,
  LinearProgress,
  TableContainer,
  TablePagination,
} from '@mui/material';

import { CONFIG } from 'src/config-global';
import { API_BASE_URL, apiService } from 'src/services/api';

import { useSnackbar } from 'src/components/snackbar';

// ----------------------------------------------------------------------

export default function DevicesPage() {
  const [activeTab, setActiveTab] = useState(0);
  const { enqueueSnackbar } = useSnackbar();
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceGroups, setDeviceGroups] = useState<DeviceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialogs state
  const [addDeviceDialog, setAddDeviceDialog] = useState(false);
  const [addGroupDialog, setAddGroupDialog] = useState(false);
  const [editGroupDialog, setEditGroupDialog] = useState(false);
  const [editDeviceDialog, setEditDeviceDialog] = useState(false);

  // Form state
  const [selectedGroup, setSelectedGroup] = useState<DeviceGroup | null>(null);
  const [newDevice, setNewDevice] = useState({
    name: '',
    topic: '',
    group_id: undefined as number | undefined,
    longitude: 0,
    latitude: 0,
    address: '',
  });
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
  });
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string>('');

  const [editingDevice, setEditingDevice] = useState<Device | null>(null);

  const fetchDeviceGroups = useCallback(async () => {
    try {
      const response = await apiService.getDeviceGroups();
      const groupsData = Array.isArray(response) ? response : [];
      const transformedGroups = groupsData.map((group) => ({
        id: group.ID || group.id,
        name: group.name,
        description: group.description,
        icon_url: group.icon_url,
        created_at: group.CreatedAt || group.created_at,
        updated_at: group.UpdatedAt || group.updated_at,
      }));
      setDeviceGroups(transformedGroups);
    } catch (err) {
      console.error('Failed to fetch device groups:', err);
      enqueueSnackbar('获取设备组列表失败', { variant: 'error' });
    }
  }, [enqueueSnackbar]);

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getDevices();
      const devicesData = Array.isArray(response) ? [...response] : [];

      const transformedDevices = devicesData.map((device) => ({
        id: device.ID || device.id,
        name: device.name,
        topic: device.topic,
        user_id: device.user_id,
        group_id: device.group_id ? Number(device.group_id) : undefined,
        device_group: device.device_group,
        longitude: device.longitude,
        latitude: device.latitude,
        address: device.address,
        status: device.status as 'online' | 'offline' | 'warning',
        last_seen: device.last_seen,
        created_at: device.CreatedAt || device.created_at,
        updated_at: device.UpdatedAt || device.updated_at,
      }));

      setDevices(transformedDevices);
    } catch (err) {
      console.error('Failed to fetch devices:', err);
      enqueueSnackbar('获取设备列表失败', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  const handleAddGroup = async () => {
    try {
      await apiService.createDeviceGroup({ ...newGroup, icon: iconFile || undefined });
      setAddGroupDialog(false);
      setNewGroup({ name: '', description: '' });
      setIconFile(null);
      setIconPreview('');
      enqueueSnackbar('设备组添加成功', { variant: 'success' });
      fetchDeviceGroups();
    } catch (err) {
      console.error('Failed to add device group:', err);
      enqueueSnackbar('添加设备组失败', { variant: 'error' });
    }
  };

  const handleEditGroup = async () => {
    if (!selectedGroup) return;

    try {
      await apiService.updateDeviceGroup(selectedGroup.id, {
        ...newGroup,
        icon: iconFile || undefined,
      });
      setEditGroupDialog(false);
      setSelectedGroup(null);
      setNewGroup({ name: '', description: '' });
      setIconFile(null);
      setIconPreview('');
      enqueueSnackbar('设备组更新成功', { variant: 'success' });
      fetchDeviceGroups();
    } catch (err) {
      console.error('Failed to update device group:', err);
      enqueueSnackbar('更新设备组失败', { variant: 'error' });
    }
  };

  // 处理编辑对话框打开时的图标预览
  useEffect(() => {
    if (editGroupDialog && selectedGroup) {
      setNewGroup({
        name: selectedGroup.name,
        description: selectedGroup.description || '',
      });
      setIconPreview(
        selectedGroup.icon_url ? `${API_BASE_URL.replace('/api', '')}${selectedGroup.icon_url}` : ''
      );
      setIconFile(null);
    }
  }, [editGroupDialog, selectedGroup]);

  const handleAddDevice = async () => {
    try {
      await apiService.createDevice(newDevice);
      setAddDeviceDialog(false);
      setNewDevice({
        name: '',
        topic: '',
        group_id: undefined,
        longitude: 0,
        latitude: 0,
        address: '',
      });
      enqueueSnackbar('设备添加成功', { variant: 'success' });
      fetchDevices();
    } catch (err) {
      console.error('Failed to add device:', err);
      enqueueSnackbar('添加设备失败', { variant: 'error' });
    }
  };

  const handleEditDevice = async () => {
    if (!editingDevice) return;

    try {
      await apiService.updateDevice(editingDevice.id, {
        name: newDevice.name,
        topic: newDevice.topic,
        group_id: newDevice.group_id,
        longitude: newDevice.longitude,
        latitude: newDevice.latitude,
        address: newDevice.address,
      });
      setEditDeviceDialog(false);
      setEditingDevice(null);
      setNewDevice({
        name: '',
        topic: '',
        group_id: undefined,
        longitude: 0,
        latitude: 0,
        address: '',
      });
      enqueueSnackbar('设备更新成功', { variant: 'success' });
      fetchDevices();
    } catch (err) {
      console.error('Failed to update device:', err);
      enqueueSnackbar('更新设备失败', { variant: 'error' });
    }
  };

  const handleOpenEditDevice = (device: Device) => {
    setEditingDevice(device);
    setNewDevice({
      name: device.name,
      topic: device.topic,
      group_id: device.group_id,
      longitude: device.longitude,
      latitude: device.latitude,
      address: device.address,
    });
    setEditDeviceDialog(true);
  };

  const handleDeleteDevice = async (id: number) => {
    try {
      await apiService.deleteDevice(id);
      enqueueSnackbar('设备删除成功', { variant: 'success' });
      fetchDevices();
    } catch (err) {
      console.error('Failed to delete device:', err);
      enqueueSnackbar('删除设备失败', { variant: 'error' });
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchDeviceGroups();
  }, [fetchDevices, fetchDeviceGroups]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'success';
      case 'warning':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
        return '在线';
      case 'warning':
        return '警告';
      default:
        return '离线';
    }
  };

  const formatDateTime = (timestamp: number) => {
    if (!timestamp) return '未知';
    return new Date(timestamp).toLocaleString();
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredDevices =
    activeTab === 0
      ? devices
      : activeTab === 1
        ? devices.filter((device) => !device.group_id)
        : devices.filter((device) => device.group_id === deviceGroups[activeTab - 2]?.id);

  const paginatedDevices = filteredDevices.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <LinearProgress sx={{ width: '100%', maxWidth: 400 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <title>{`设备管理 - ${CONFIG.appName}`}</title>

      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">设备管理</Typography>
          <Box display="flex" gap={1}>
            <IconButton onClick={fetchDevices} size="large">
              <RefreshIcon />
            </IconButton>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddDeviceDialog(true)}
            >
              添加设备
            </Button>
            <Button
              variant="outlined"
              startIcon={<CategoryIcon />}
              onClick={() => setAddGroupDialog(true)}
            >
              添加设备组
            </Button>
          </Box>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_: React.SyntheticEvent, newValue: number) => {
              setActiveTab(newValue);
            }}
          >
            <Tab label="所有设备" />
            <Tab label="未分组" />
            {deviceGroups.map((group, index) => (
              <Tab
                key={group.id}
                label={
                  <Box display="flex" alignItems="center" gap={0.5}>
                    {group.icon_url && (
                      <Box
                        component="img"
                        src={`${API_BASE_URL.replace('/api', '')}${group.icon_url}`}
                        alt={group.name}
                        sx={{
                          width: 16,
                          height: 16,
                        }}
                      />
                    )}
                    {group.name}
                  </Box>
                }
              />
            ))}
          </Tabs>
        </Box>

        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer>
            <Table stickyHeader aria-label="设备列表">
              <TableHead>
                <TableRow>
                  <TableCell>设备名称</TableCell>
                  <TableCell>Topic</TableCell>
                  <TableCell>设备组</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>位置坐标</TableCell>
                  <TableCell>地址</TableCell>
                  <TableCell>最后在线时间</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedDevices.map((device) => (
                  <TableRow
                    key={device.id}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell component="th" scope="row">
                      <Typography variant="subtitle2">{device.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {device.topic}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {device.device_group?.name || '未分组'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusText(device.status)}
                        color={getStatusColor(device.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {device.longitude && device.latitude ? (
                        <Box display="flex" alignItems="center">
                          <LocationIcon fontSize="small" color="action" sx={{ mr: 0.5 }} />
                          <Typography variant="body2" color="text.secondary">
                            {device.longitude.toFixed(6)}, {device.latitude.toFixed(6)}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          未设置
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {device.address || '未设置'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDateTime(device.last_seen)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <Tooltip title="编辑设备">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenEditDevice(device)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="删除设备">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteDevice(device.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {filteredDevices.length === 0 && (
            <Box display="flex" justifyContent="center" alignItems="center" height={200}>
              <Typography variant="body2" color="text.secondary">
                暂无设备数据
              </Typography>
            </Box>
          )}

          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredDevices.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            labelRowsPerPage="每页行数:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} / ${count !== -1 ? count : `超过 ${to}`}`
            }
          />
        </Paper>

        {/* Add Device Dialog */}
        <Dialog
          open={addDeviceDialog}
          onClose={() => setAddDeviceDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>添加新设备</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <TextField
                label="设备名称"
                value={newDevice.name}
                onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                required
              />
              <TextField
                label="设备 Topic"
                value={newDevice.topic}
                onChange={(e) => setNewDevice({ ...newDevice, topic: e.target.value })}
                required
              />
              <TextField
                select
                label="设备组"
                value={
                  newDevice.group_id === undefined || newDevice.group_id === null
                    ? ''
                    : newDevice.group_id
                }
                onChange={(e) => {
                  const value = e.target.value;
                  setNewDevice({
                    ...newDevice,
                    group_id: value === '' || value === undefined ? undefined : parseInt(value),
                  });
                }}
              >
                <MenuItem value="">未分组</MenuItem>
                {deviceGroups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="经度"
                type="number"
                value={newDevice.longitude}
                onChange={(e) =>
                  setNewDevice({ ...newDevice, longitude: parseFloat(e.target.value) || 0 })
                }
              />
              <TextField
                label="纬度"
                type="number"
                value={newDevice.latitude}
                onChange={(e) =>
                  setNewDevice({ ...newDevice, latitude: parseFloat(e.target.value) || 0 })
                }
              />
              <TextField
                label="地址"
                value={newDevice.address}
                onChange={(e) => setNewDevice({ ...newDevice, address: e.target.value })}
                multiline
                rows={2}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddDeviceDialog(false)}>取消</Button>
            <Button
              onClick={handleAddDevice}
              variant="contained"
              disabled={!newDevice.name || !newDevice.topic}
            >
              添加
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Device Dialog */}
        <Dialog
          open={editDeviceDialog}
          onClose={() => {
            setEditDeviceDialog(false);
            setEditingDevice(null);
            setNewDevice({
              name: '',
              topic: '',
              group_id: undefined,
              longitude: 0,
              latitude: 0,
              address: '',
            });
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>编辑设备</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <TextField
                label="设备名称"
                value={newDevice.name}
                onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                required
              />
              <TextField
                label="设备 Topic"
                value={newDevice.topic}
                onChange={(e) => setNewDevice({ ...newDevice, topic: e.target.value })}
                required
              />
              <TextField
                select
                label="设备组"
                value={
                  newDevice.group_id === undefined || newDevice.group_id === null
                    ? ''
                    : newDevice.group_id
                }
                onChange={(e) => {
                  const value = e.target.value;
                  setNewDevice({
                    ...newDevice,
                    group_id: value === '' || value === undefined ? undefined : parseInt(value),
                  });
                }}
              >
                <MenuItem value="">未分组</MenuItem>
                {deviceGroups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="经度"
                type="number"
                value={newDevice.longitude}
                onChange={(e) =>
                  setNewDevice({ ...newDevice, longitude: parseFloat(e.target.value) || 0 })
                }
              />
              <TextField
                label="纬度"
                type="number"
                value={newDevice.latitude}
                onChange={(e) =>
                  setNewDevice({ ...newDevice, latitude: parseFloat(e.target.value) || 0 })
                }
              />
              <TextField
                label="地址"
                value={newDevice.address}
                onChange={(e) => setNewDevice({ ...newDevice, address: e.target.value })}
                multiline
                rows={2}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setEditDeviceDialog(false);
                setEditingDevice(null);
                setNewDevice({
                  name: '',
                  topic: '',
                  group_id: undefined,
                  longitude: 0,
                  latitude: 0,
                  address: '',
                });
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleEditDevice}
              variant="contained"
              disabled={!newDevice.name || !newDevice.topic}
            >
              保存
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add Group Dialog */}
        <Dialog
          open={addGroupDialog}
          onClose={() => setAddGroupDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>添加设备组</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <TextField
                label="设备组名称"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                required
              />
              <TextField
                label="描述"
                value={newGroup.description}
                onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                multiline
                rows={3}
              />

              {/* 图标上传 */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  图标上传 (仅支持SVG格式)
                </Typography>
                <input
                  accept=".svg"
                  style={{ display: 'none' }}
                  id="icon-upload-add"
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.type !== 'image/svg+xml') {
                        enqueueSnackbar('请选择SVG格式的文件', { variant: 'error' });
                        return;
                      }
                      setIconFile(file);
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setIconPreview(event.target?.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <label htmlFor="icon-upload-add">
                  <Button variant="outlined" component="span" startIcon={<AddIcon />}>
                    选择图标
                  </Button>
                </label>

                {iconPreview && (
                  <Box mt={2}>
                    <Typography variant="caption" display="block" gutterBottom>
                      图标预览:
                    </Typography>
                    <Box
                      component="img"
                      src={iconPreview}
                      alt="图标预览"
                      sx={{
                        maxWidth: 100,
                        maxHeight: 100,
                        border: '1px solid #ddd',
                        borderRadius: 1,
                        p: 1,
                      }}
                    />
                  </Box>
                )}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setAddGroupDialog(false);
                setIconFile(null);
                setIconPreview('');
              }}
            >
              取消
            </Button>
            <Button onClick={handleAddGroup} variant="contained" disabled={!newGroup.name}>
              添加
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Group Dialog */}
        <Dialog
          open={editGroupDialog}
          onClose={() => setEditGroupDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>编辑设备组</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <TextField
                label="设备组名称"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                required
              />
              <TextField
                label="描述"
                value={newGroup.description}
                onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                multiline
                rows={3}
              />

              {/* 图标上传 */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  图标上传 (仅支持SVG格式)
                </Typography>
                <input
                  accept=".svg"
                  style={{ display: 'none' }}
                  id="icon-upload-edit"
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.type !== 'image/svg+xml') {
                        enqueueSnackbar('请选择SVG格式的文件', { variant: 'error' });
                        return;
                      }
                      setIconFile(file);
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setIconPreview(event.target?.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <label htmlFor="icon-upload-edit">
                  <Button variant="outlined" component="span" startIcon={<AddIcon />}>
                    选择图标
                  </Button>
                </label>

                {iconPreview && (
                  <Box mt={2}>
                    <Typography variant="caption" display="block" gutterBottom>
                      图标预览:
                    </Typography>
                    <Box
                      component="img"
                      src={iconPreview}
                      alt="图标预览"
                      sx={{
                        maxWidth: 100,
                        maxHeight: 100,
                        border: '1px solid #ddd',
                        borderRadius: 1,
                        p: 1,
                      }}
                    />
                  </Box>
                )}

                {selectedGroup?.icon_url && !iconPreview && (
                  <Box mt={2}>
                    <Typography variant="caption" display="block" gutterBottom>
                      当前图标:
                    </Typography>
                    <Box
                      component="img"
                      src={`${API_BASE_URL.replace('/api', '')}${selectedGroup.icon_url}`}
                      alt="当前图标"
                      sx={{
                        maxWidth: 100,
                        maxHeight: 100,
                        border: '1px solid #ddd',
                        borderRadius: 1,
                        p: 1,
                      }}
                    />
                  </Box>
                )}
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setEditGroupDialog(false);
                setIconFile(null);
                setIconPreview('');
              }}
            >
              取消
            </Button>
            <Button onClick={handleEditGroup} variant="contained" disabled={!newGroup.name}>
              保存
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
