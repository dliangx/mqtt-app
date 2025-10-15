import type { MessageTypeConfig, MessageFormat, FieldDefinition } from 'src/types';

import React, { useState, useEffect } from 'react';

import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import {
  Box,
  Card,
  TextField,
  Button,
  MenuItem,
  Typography,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  Divider,
  Chip,
  Paper,
} from '@mui/material';

import { apiService } from 'src/services/api';

import { useSnackbar } from 'src/components/snackbar';

// ----------------------------------------------------------------------

interface MessageTypeFormProps {
  config?: MessageTypeConfig | null;
  onSave: (config: MessageTypeConfig) => void;
  onCancel: () => void;
  mode: 'create' | 'edit' | 'list';
}

// ----------------------------------------------------------------------

const fieldTypes = [
  { value: 'int8', label: 'int8 (1字节)' },
  { value: 'uint8', label: 'uint8 (1字节)' },
  { value: 'int16', label: 'int16 (2字节)' },
  { value: 'uint16', label: 'uint16 (2字节)' },
  { value: 'int32', label: 'int32 (4字节)' },
  { value: 'uint32', label: 'uint32 (4字节)' },
  { value: 'float32', label: 'float32 (4字节)' },
  { value: 'float64', label: 'float64 (8字节)' },
  { value: 'string', label: '字符串' },
  { value: 'bytes', label: '字节数组' },
];

const endianOptions = [
  { value: 'big', label: '大端序' },
  { value: 'little', label: '小端序' },
];

const protocolOptions = [
  { value: 'tcp', label: 'TCP' },
  { value: 'udp', label: 'UDP' },
  { value: 'mqtt', label: 'MQTT' },
  { value: 'http', label: 'HTTP' },
  { value: 'modbus', label: 'Modbus' },
];

const defaultFormat: MessageFormat = {
  header: [],
  body: [],
  footer: [],
  delimiter: '',
  encoding: 'hex',
};

const defaultField: FieldDefinition = {
  name: '',
  type: 'uint8',
  offset: 0,
  length: 1,
  endian: 'big',
  signed: false,
  decimals: 0,
  unit: '',
};

// ----------------------------------------------------------------------

export default function MessageTypeForm({ config, onSave, onCancel, mode }: MessageTypeFormProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    protocol: 'tcp',
    format: defaultFormat,
    is_default: false,
  });

  useEffect(() => {
    if (config) {
      setFormData({
        name: config.name,
        description: config.description,
        protocol: config.protocol,
        format: typeof config.format === 'string' ? JSON.parse(config.format) : config.format,
        is_default: config.is_default,
      });
    }
  }, [config]);

  const handleInputChange =
    (field: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handleFormatChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      format: {
        ...prev.format,
        [field]: value,
      },
    }));
  };

  const handleAddField = (section: 'header' | 'body' | 'footer') => {
    handleFormatChange(section, [...formData.format[section], { ...defaultField }]);
  };

  const handleFieldChange = (
    section: 'header' | 'body' | 'footer',
    index: number,
    field: string,
    value: any
  ) => {
    const updatedFields = [...formData.format[section]];
    updatedFields[index] = { ...updatedFields[index], [field]: value };
    handleFormatChange(section, updatedFields);
  };

  const handleRemoveField = (section: 'header' | 'body' | 'footer', index: number) => {
    const updatedFields = formData.format[section].filter((_, i) => i !== index);
    handleFormatChange(section, updatedFields);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const configData = {
        ...formData,
        format: JSON.stringify(formData.format),
      };

      let result;
      if (mode === 'create') {
        result = await apiService.createMessageTypeConfig(configData);
      } else {
        if (!config?.ID) {
          throw new Error('配置ID不存在，无法更新');
        }
        result = await apiService.updateMessageTypeConfig(config.ID, configData);
      }

      enqueueSnackbar(`配置${mode === 'create' ? '创建' : '更新'}成功`, { variant: 'success' });
      onSave(result.data as MessageTypeConfig);
    } catch (err) {
      console.error('Failed to save config:', err);
      enqueueSnackbar(`配置${mode === 'create' ? '创建' : '更新'}失败`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const renderFieldEditor = (
    section: 'header' | 'body' | 'footer',
    field: FieldDefinition,
    index: number
  ) => (
    <Paper key={index} sx={{ p: 2, mb: 1 }}>
      <Box display="flex" flexWrap="wrap" gap={2} alignItems="center">
        <TextField
          fullWidth
          size="small"
          label="字段名称"
          value={field.name}
          onChange={(e) => handleFieldChange(section, index, 'name', e.target.value)}
          sx={{ minWidth: 120 }}
        />
        <FormControl fullWidth size="small" sx={{ minWidth: 120 }}>
          <InputLabel>字段类型</InputLabel>
          <Select
            value={field.type}
            label="字段类型"
            onChange={(e) => handleFieldChange(section, index, 'type', e.target.value)}
          >
            {fieldTypes.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          type="number"
          label="偏移量"
          value={field.offset}
          onChange={(e) =>
            handleFieldChange(section, index, 'offset', parseInt(e.target.value) || 0)
          }
          sx={{ width: 80 }}
        />
        <TextField
          size="small"
          type="number"
          label="长度"
          value={field.length}
          onChange={(e) =>
            handleFieldChange(section, index, 'length', parseInt(e.target.value) || 1)
          }
          sx={{ width: 80 }}
        />
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>字节序</InputLabel>
          <Select
            value={field.endian}
            label="字节序"
            onChange={(e) => handleFieldChange(section, index, 'endian', e.target.value)}
          >
            {endianOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          type="number"
          label="小数位"
          value={field.decimals}
          onChange={(e) =>
            handleFieldChange(section, index, 'decimals', parseInt(e.target.value) || 0)
          }
          sx={{ width: 80 }}
        />
        <TextField
          size="small"
          label="单位"
          value={field.unit}
          onChange={(e) => handleFieldChange(section, index, 'unit', e.target.value)}
          sx={{ minWidth: 80 }}
        />
        <IconButton size="small" color="error" onClick={() => handleRemoveField(section, index)}>
          <DeleteIcon />
        </IconButton>
      </Box>
    </Paper>
  );

  const renderSection = (
    title: string,
    section: 'header' | 'body' | 'footer',
    fields: FieldDefinition[]
  ) => (
    <Box sx={{ mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">{title}</Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => handleAddField(section)}
          variant="outlined"
        >
          添加字段
        </Button>
      </Box>
      {fields.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          暂无字段配置
        </Typography>
      ) : (
        fields.map((field, index) => renderFieldEditor(section, field, index))
      )}
    </Box>
  );

  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        {mode === 'create' ? '新建消息类型配置' : '编辑消息类型配置'}
      </Typography>

      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* 基本信息 */}
          <Box>
            <Typography variant="h6" gutterBottom>
              基本信息
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                required
                label="配置名称"
                value={formData.name}
                onChange={handleInputChange('name')}
              />
              <FormControl fullWidth required>
                <InputLabel>协议类型</InputLabel>
                <Select
                  value={formData.protocol}
                  label="协议类型"
                  onChange={(e) => setFormData((prev) => ({ ...prev, protocol: e.target.value }))}
                >
                  {protocolOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="配置描述"
                value={formData.description}
                onChange={handleInputChange('description')}
              />
            </Box>
          </Box>

          {/* 格式配置 */}
          <Box>
            <Typography variant="h6" gutterBottom>
              数据格式配置
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
              <TextField
                fullWidth
                label="分隔符"
                value={formData.format.delimiter}
                onChange={(e) => handleFormatChange('delimiter', e.target.value)}
                placeholder="例如: , ; |"
              />
              <FormControl fullWidth>
                <InputLabel>编码方式</InputLabel>
                <Select
                  value={formData.format.encoding}
                  label="编码方式"
                  onChange={(e) => handleFormatChange('encoding', e.target.value)}
                >
                  <MenuItem value="hex">十六进制 (Hex)</MenuItem>
                  <MenuItem value="base64">Base64</MenuItem>
                  <MenuItem value="ascii">ASCII</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {renderSection('报文头字段', 'header', formData.format.header)}
            {renderSection('报文体字段', 'body', formData.format.body)}
            {renderSection('报文尾字段', 'footer', formData.format.footer)}
          </Box>

          {/* 操作按钮 */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={onCancel}
              disabled={loading}
            >
              取消
            </Button>
            <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={loading}>
              {loading ? '保存中...' : '保存配置'}
            </Button>
          </Box>
        </Box>
      </form>
    </Card>
  );
}
