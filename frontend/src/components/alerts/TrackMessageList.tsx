import type { TrackMessage } from 'src/types';

import React, { useState } from 'react';

import {
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Visibility as ReadIcon,
} from '@mui/icons-material';
import {
  Box,
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

import { useSnackbar } from 'src/components/snackbar';

// ----------------------------------------------------------------------

interface TrackMessageListProps {
  trackMessages: TrackMessage[];
  onRefresh: () => void;
}

// ----------------------------------------------------------------------

const formatTimestamp = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

const formatCoordinate = (coord?: number) => {
  if (coord === undefined || coord === null) return '-';
  return coord.toFixed(6);
};

// ----------------------------------------------------------------------

export default function TrackMessageList({ trackMessages, onRefresh }: TrackMessageListProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState<number[]>([]);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);

  const filteredTrackMessages = trackMessages;

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = filteredTrackMessages.map((message) => message.ID);
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

  const handleMarkAsRead = async (messageIds: number[]) => {
    try {
      await apiService.markAlertsAsRead(messageIds);
      enqueueSnackbar('轨迹消息已标记为已读', { variant: 'success' });
      onRefresh();
      setSelected([]);
    } catch (err) {
      console.error('Failed to mark track messages as read:', err);
      enqueueSnackbar('标记轨迹消息为已读失败', { variant: 'error' });
    }
  };

  const handleDeleteMessages = async (messageIds: number[]) => {
    try {
      await apiService.deleteAlerts(messageIds);
      enqueueSnackbar('轨迹消息已删除', { variant: 'success' });
      onRefresh();
      setSelected([]);
    } catch (err) {
      console.error('Failed to delete track messages:', err);
      enqueueSnackbar('删除轨迹消息失败', { variant: 'error' });
    }
  };

  const isSelected = (id: number) => selected.indexOf(id) !== -1;

  const emptyRows =
    page > 0 ? Math.max(0, (1 + page) * rowsPerPage - filteredTrackMessages.length) : 0;

  const paginatedMessages = filteredTrackMessages.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      {/* Action Bar */}
      <Box display="flex" justifyContent="flex-end" alignItems="center" mb={2}>
        {selected.length > 0 && (
          <Box display="flex" gap={1}>
            <Tooltip title="标记为已读">
              <IconButton size="small" onClick={() => handleMarkAsRead(selected)} color="primary">
                <ReadIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="删除">
              <IconButton size="small" onClick={() => handleDeleteMessages(selected)} color="error">
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
                  indeterminate={
                    selected.length > 0 && selected.length < filteredTrackMessages.length
                  }
                  checked={
                    filteredTrackMessages.length > 0 &&
                    selected.length === filteredTrackMessages.length
                  }
                  onChange={handleSelectAllClick}
                />
              </TableCell>
              <TableCell>设备ID</TableCell>
              <TableCell>设备类型</TableCell>
              <TableCell>消息类型</TableCell>
              <TableCell>经度</TableCell>
              <TableCell>纬度</TableCell>
              <TableCell>SNR</TableCell>
              <TableCell>温度</TableCell>
              <TableCell>电压</TableCell>
              <TableCell>发送时间</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedMessages.map((message) => {
              const isItemSelected = isSelected(message.ID);
              return (
                <TableRow key={message.ID} hover selected={isItemSelected}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isItemSelected}
                      onChange={(event) => handleCheckboxChange(event, message.ID)}
                      onClick={(event) => event.stopPropagation()}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{`${message.device_id}`}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{message.device_type || '-'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{message.type}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatCoordinate(message.longitude)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatCoordinate(message.latitude)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {message.snr !== undefined ? `${message.snr} dB` : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {message.temperature !== undefined ? `${message.temperature}°C` : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {message.voltage !== undefined ? `${message.voltage}V` : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatTimestamp(message.timestamp)}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
            {emptyRows > 0 && (
              <TableRow style={{ height: 53 * emptyRows }}>
                <TableCell colSpan={10} />
              </TableRow>
            )}
            {filteredTrackMessages.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">暂无轨迹消息数据</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 100]}
        component="div"
        count={filteredTrackMessages.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="每页行数:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} / ${count !== -1 ? count : `超过 ${to}`}`
        }
      />

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
        <MenuItem onClick={() => handleDeleteMessages(selected)}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>删除轨迹消息</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
