import type { Device } from 'src/types';

import React, { useState, useEffect } from 'react';

import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import {
  Box,
  Chip,
  Paper,
  Table,
  Button,
  Dialog,
  Tooltip,
  TableRow,
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
import { apiService } from 'src/services/api';

import { useSnackbar } from 'src/components/snackbar';

// ----------------------------------------------------------------------

export default function DevicesPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [addDeviceDialog, setAddDeviceDialog] = useState(false);
  const [newDevice, setNewDevice] = useState({
    name: '',
    topic: '',
    longitude: 0,
    latitude: 0,
    address: '',
  });

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDevices();
      const devicesData = Array.isArray(response) ? [...response] : [];

      const transformedDevices = devicesData.map((device) => ({
        id: device.ID || device.id,
        name: device.name,
        topic: device.topic,
        user_id: device.user_id,
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
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleAddDevice = async () => {
    try {
      await apiService.createDevice(newDevice);
      setAddDeviceDialog(false);
      setNewDevice({
        name: '',
        topic: '',
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

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedDevices = devices.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <LinearProgress sx={{ width: '100%', maxWidth: 400 }} />
      </Box>
    );
  }

  return (
    <>
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
          </Box>
        </Box>

        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader aria-label="设备列表">
              <TableHead>
                <TableRow>
                  <TableCell>设备名称</TableCell>
                  <TableCell>Topic</TableCell>
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
                          <IconButton size="small" color="primary">
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
          {devices.length === 0 && (
            <Box display="flex" justifyContent="center" alignItems="center" height={200}>
              <Typography variant="body2" color="text.secondary">
                暂无设备数据
              </Typography>
            </Box>
          )}

          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={devices.length}
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
                label="经度"
                type="number"
                value={newDevice.longitude}
                onChange={(e) =>
                  setNewDevice({
                    ...newDevice,
                    longitude: parseFloat(e.target.value) || 0,
                  })
                }
              />
              <TextField
                label="纬度"
                type="number"
                value={newDevice.latitude}
                onChange={(e) =>
                  setNewDevice({
                    ...newDevice,
                    latitude: parseFloat(e.target.value) || 0,
                  })
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
      </Box>
    </>
  );
}
