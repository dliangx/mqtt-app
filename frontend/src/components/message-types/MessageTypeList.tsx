import type { MessageTypeConfig } from 'src/types';

import React, { useState } from 'react';

import {
  Add as AddIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import {
  Box,
  Card,
  Chip,
  Menu,
  Table,
  Button,
  Tooltip,
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

interface MessageTypeListProps {
  configs: MessageTypeConfig[];
  onRefresh: () => void;
  onEdit: (config: MessageTypeConfig) => void;
  onCreate: () => void;
}

// ----------------------------------------------------------------------

const formatTimestamp = (timestamp: string) =>
  new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

// ----------------------------------------------------------------------

export default function MessageTypeList({
  configs,
  onRefresh,
  onEdit,
  onCreate,
}: MessageTypeListProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedConfig, setSelectedConfig] = useState<MessageTypeConfig | null>(null);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSetDefault = async (config: MessageTypeConfig) => {
    try {
      await apiService.setDefaultMessageTypeConfig(config.ID);
      enqueueSnackbar('已设置为默认配置', { variant: 'success' });
      onRefresh();
    } catch (err) {
      console.error('Failed to set default config:', err);
      enqueueSnackbar('设置默认配置失败', { variant: 'error' });
    }
  };

  const handleDelete = async (config: MessageTypeConfig) => {
    try {
      await apiService.deleteMessageTypeConfig(config.ID);
      enqueueSnackbar('配置已删除', { variant: 'success' });
      onRefresh();
    } catch (err) {
      console.error('Failed to delete config:', err);
      enqueueSnackbar('删除配置失败', { variant: 'error' });
    }
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, config: MessageTypeConfig) => {
    setActionMenuAnchor(event.currentTarget);
    setSelectedConfig(config);
  };

  const handleCloseMenu = () => {
    setActionMenuAnchor(null);
    setSelectedConfig(null);
  };

  const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - configs.length) : 0;

  const paginatedConfigs = configs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      {/* Action Bar */}

      {/* Table */}
      <TableContainer component={Card}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>名称</TableCell>
              <TableCell>描述</TableCell>
              <TableCell>协议</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>创建时间</TableCell>
              <TableCell align="center">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedConfigs.map((config) => (
              <TableRow key={config.ID} hover>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {config.ID}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <SettingsIcon fontSize="small" color="action" />
                    <Typography variant="body2" fontWeight="medium">
                      {config.name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                    {config.description || '无描述'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={config.protocol.toUpperCase()}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                </TableCell>
                <TableCell>
                  {config.is_default ? (
                    <Chip
                      label="默认"
                      size="small"
                      color="success"
                      variant="filled"
                      icon={<CheckIcon />}
                    />
                  ) : (
                    <Chip label="普通" size="small" variant="outlined" color="default" />
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {formatTimestamp(config.CreatedAt)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Box display="flex" gap={0.5} justifyContent="center">
                    <Tooltip title="编辑">
                      <IconButton
                        size="small"
                        onClick={() => {
                          onEdit(config);
                        }}
                        color="primary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="更多操作">
                      <IconButton size="small" onClick={(event) => handleOpenMenu(event, config)}>
                        <MoreIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {emptyRows > 0 && (
              <TableRow style={{ height: 53 * emptyRows }}>
                <TableCell colSpan={7} />
              </TableRow>
            )}
            {configs.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">暂无配置数据</Typography>
                  <Button variant="text" startIcon={<AddIcon />} onClick={onCreate} sx={{ mt: 1 }}>
                    创建第一个配置
                  </Button>
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
        count={configs.length}
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
      <Menu anchorEl={actionMenuAnchor} open={Boolean(actionMenuAnchor)} onClose={handleCloseMenu}>
        {selectedConfig && !selectedConfig.is_default && (
          <MenuItem
            onClick={() => {
              handleSetDefault(selectedConfig);
              handleCloseMenu();
            }}
          >
            <ListItemIcon>
              <CheckIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>设为默认</ListItemText>
          </MenuItem>
        )}
        <MenuItem
          onClick={() => {
            if (selectedConfig) onEdit(selectedConfig);
            handleCloseMenu();
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>编辑配置</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedConfig) handleDelete(selectedConfig);
            handleCloseMenu();
          }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>删除配置</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
