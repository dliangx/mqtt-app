import type { Alert } from 'src/types';

import React, { useState } from 'react';

import {
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Visibility as ReadIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import {
  Box,
  Chip,
  Menu,
  Table,
  Tooltip,
  Checkbox,
  MenuItem,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  IconButton,
  Typography,
  ListItemIcon,
  ListItemText,
  TableContainer,
  TablePagination,
} from '@mui/material';

import { apiService } from 'src/services/api';

import { Label } from 'src/components/label';
import { useSnackbar } from 'src/components/snackbar';

// ----------------------------------------------------------------------

interface AlertListProps {
  alerts: Alert[];
  onRefresh: () => void;
  onAlertClick?: (alert: Alert) => void;
}

// ----------------------------------------------------------------------

const getLevelColor = (level: Alert['level']) => {
  switch (level) {
    case 'critical':
      return 'error';
    case 'high':
      return 'warning';
    case 'medium':
      return 'info';
    case 'low':
      return 'success';
    default:
      return 'default';
  }
};

const formatTimestamp = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

// ----------------------------------------------------------------------

export default function AlertList({ alerts, onRefresh }: AlertListProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState<number[]>([]);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [filterLevel, setFilterLevel] = useState<Alert['level'] | 'all'>('all');
  const [filterRead, setFilterRead] = useState<'all' | 'read' | 'unread'>('all');

  const filteredAlerts = alerts.filter((alert) => {
    if (filterLevel !== 'all' && alert.level !== filterLevel) return false;
    if (filterRead === 'read' && !alert.read) return false;
    if (filterRead === 'unread' && alert.read) return false;
    return true;
  });

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = filteredAlerts.map((alert) => alert.ID);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>, id: number) => {
    event.stopPropagation();
    let newSelected: number[] = [];

    if (event.target.checked) {
      newSelected = [...selected, id];
    } else {
      newSelected = selected.filter((selectedId) => selectedId !== id);
    }
    setSelected(newSelected);
  };

  const handleMarkAsRead = async (alertIds: number[]) => {
    try {
      await apiService.markAlertsAsRead(alertIds);
      enqueueSnackbar('报警已标记为已读', { variant: 'success' });
      onRefresh();
      setSelected([]);
    } catch (err) {
      console.error('Failed to mark alerts as read:', err);
      enqueueSnackbar('标记报警为已读失败', { variant: 'error' });
    }
  };

  const handleDeleteAlerts = async (alertIds: number[]) => {
    try {
      await apiService.deleteAlerts(alertIds);
      enqueueSnackbar('报警已删除', { variant: 'success' });
      onRefresh();
      setSelected([]);
    } catch (err) {
      console.error('Failed to delete alerts:', err);
      enqueueSnackbar('删除报警失败', { variant: 'error' });
    }
  };

  const isSelected = (id: number) => selected.indexOf(id) !== -1;

  const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - filteredAlerts.length) : 0;

  const paginatedAlerts = filteredAlerts.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      {/* Filter and Action Bar */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <Tooltip title="筛选">
            <IconButton size="small" onClick={(event) => setFilterMenuAnchor(event.currentTarget)}>
              <FilterIcon />
            </IconButton>
          </Tooltip>
          <Chip
            label={`等级: ${filterLevel === 'all' ? '全部' : filterLevel}`}
            size="small"
            variant="outlined"
          />
          <Chip
            label={`状态: ${
              filterRead === 'all' ? '全部' : filterRead === 'read' ? '已读' : '未读'
            }`}
            size="small"
            variant="outlined"
          />
        </Box>

        {selected.length > 0 && (
          <Box display="flex" gap={1}>
            <Tooltip title="标记为已读">
              <IconButton size="small" onClick={() => handleMarkAsRead(selected)} color="primary">
                <ReadIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="删除">
              <IconButton size="small" onClick={() => handleDeleteAlerts(selected)} color="error">
                <DeleteIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="更多操作">
              <IconButton
                size="small"
                onClick={(event) => setActionMenuAnchor(event.currentTarget)}
              >
                <MoreIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* Table */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selected.length > 0 && selected.length < filteredAlerts.length}
                  checked={filteredAlerts.length > 0 && selected.length === filteredAlerts.length}
                  onChange={handleSelectAllClick}
                />
              </TableCell>
              <TableCell>设备</TableCell>
              <TableCell>报警类型</TableCell>
              <TableCell>消息</TableCell>
              <TableCell>等级</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>时间</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedAlerts.map((alert) => {
              const isItemSelected = isSelected(alert.ID);
              return (
                <TableRow key={alert.ID} hover selected={isItemSelected}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isItemSelected}
                      onChange={(event) => handleCheckboxChange(event, alert.ID)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{`设备 ${alert.device_id}`}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{alert.type}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {alert.message}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Label color={getLevelColor(alert.level)} variant="soft">
                      {alert.level}
                    </Label>
                  </TableCell>
                  <TableCell>
                    <Label color={alert.read ? 'default' : 'error'} variant="soft">
                      {alert.read ? '已读' : '未读'}
                    </Label>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatTimestamp(alert.timestamp)}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
            {emptyRows > 0 && (
              <TableRow style={{ height: 53 * emptyRows }}>
                <TableCell colSpan={7} />
              </TableRow>
            )}
            {filteredAlerts.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">暂无报警数据</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filteredAlerts.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="每页行数:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} / ${count !== -1 ? count : `超过 ${to}`}`
        }
      />

      {/* Filter Menu */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={() => setFilterMenuAnchor(null)}
      >
        <MenuItem onClick={() => setFilterLevel('all')}>
          <ListItemText>全部等级</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => setFilterLevel('critical')}>
          <ListItemText>严重</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => setFilterLevel('high')}>
          <ListItemText>高</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => setFilterLevel('medium')}>
          <ListItemText>中</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => setFilterLevel('low')}>
          <ListItemText>低</ListItemText>
        </MenuItem>
        <MenuItem divider />
        <MenuItem onClick={() => setFilterRead('all')}>
          <ListItemText>全部状态</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => setFilterRead('read')}>
          <ListItemText>已读</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => setFilterRead('unread')}>
          <ListItemText>未读</ListItemText>
        </MenuItem>
      </Menu>

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={() => setActionMenuAnchor(null)}
      >
        <MenuItem onClick={() => handleMarkAsRead(selected)}>
          <ListItemIcon>
            <ReadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>标记为已读</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDeleteAlerts(selected)}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>删除报警</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
