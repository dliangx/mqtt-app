import type { MessageTypeConfig } from 'src/types';

import React, { useState, useEffect, useCallback } from 'react';

import {
  Add as AddIcon,
  Settings as SettingsIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  LinearProgress,
} from '@mui/material';

import { CONFIG } from 'src/config-global';
import { apiService } from 'src/services/api';

import { useSnackbar } from 'src/components/snackbar';

import MessageTypeList from '../components/message-types/MessageTypeList';
import MessageTypeForm from '../components/message-types/MessageTypeForm';

// ----------------------------------------------------------------------

type ViewMode = 'list' | 'create' | 'edit';

// ----------------------------------------------------------------------

export default function MessageTypesPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [configs, setConfigs] = useState<MessageTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedConfig, setSelectedConfig] = useState<MessageTypeConfig | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchConfigs = useCallback(async () => {
    try {
      const response = await apiService.getMessageTypeConfigs();
      setConfigs(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to fetch message type configs:', err);
      enqueueSnackbar('获取消息类型配置失败', { variant: 'error' });
      throw err;
    }
  }, [enqueueSnackbar]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      await fetchConfigs();
    } catch (err) {
      // Error already handled in fetchConfigs
    } finally {
      setLoading(false);
    }
  }, [fetchConfigs]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = () => {
    setSelectedConfig(null);
    setViewMode('create');
    setDialogOpen(true);
  };

  const handleEdit = (config: MessageTypeConfig) => {
    console.log('Editing config:', config);
    console.log('Config ID:', config.ID);
    console.log('Config keys:', Object.keys(config));
    setSelectedConfig(config);
    setViewMode('edit');
    setDialogOpen(true);
  };

  const handleSave = (savedConfig: MessageTypeConfig) => {
    setDialogOpen(false);
    setViewMode('list');
    fetchData();
  };

  const handleCancel = () => {
    setDialogOpen(false);
    setViewMode('list');
    setSelectedConfig(null);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setViewMode('list');
    setSelectedConfig(null);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <LinearProgress sx={{ width: '100%', maxWidth: 400 }} />
        </Box>
      );
    }

    return (
      <Paper sx={{ p: 3 }}>
        <MessageTypeList
          configs={configs}
          onRefresh={fetchData}
          onEdit={handleEdit}
          onCreate={handleCreate}
        />
      </Paper>
    );
  };

  const renderDialog = () => {
    if (!dialogOpen) return null;

    return (
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton size="small" onClick={handleCloseDialog} sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
            <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            {viewMode === 'create' ? '新建消息类型配置' : '编辑消息类型配置'}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <MessageTypeForm
            config={selectedConfig}
            onSave={handleSave}
            onCancel={handleCancel}
            mode={viewMode}
          />
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <Box sx={{ p: 4 }}>
      <title>{`消息类型配置 - ${CONFIG.appName}`}</title>

      <Box>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <SettingsIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4">消息类型配置</Typography>
            </Box>
          </Box>

          {viewMode === 'list' && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate} size="large">
              新建配置
            </Button>
          )}
        </Box>

        {/* Content */}
        {renderContent()}

        {/* Dialog */}
        {renderDialog()}
      </Box>
    </Box>
  );
}
