import React, { useState } from "react";
import {
  Box,
  Button,
  IconButton,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Collapse,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Fence as FenceIcon,
} from "@mui/icons-material";
import type { Geofence } from "../../utils/geofence";

interface GeofenceToolbarProps {
  geofences: Geofence[];
  onGeofenceCreate: (geofence: Omit<Geofence, "id">) => void;
  onGeofenceUpdate: (id: string, geofence: Partial<Geofence>) => void;
  onGeofenceDelete: (id: string) => void;
  onGeofenceSelect: (geofence: Geofence | null) => void;
  selectedGeofence: Geofence | null;
  isDrawing: boolean;
  onDrawingToggle: (drawing: boolean) => void;
}

const GeofenceToolbar: React.FC<GeofenceToolbarProps> = ({
  geofences,
  onGeofenceCreate,
  onGeofenceUpdate,
  onGeofenceDelete,
  onGeofenceSelect,
  selectedGeofence,
  isDrawing,
  onDrawingToggle,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState<Geofence | null>(null);
  const [wasExpandedBeforeDrawing, setWasExpandedBeforeDrawing] =
    useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "polygon" as "polygon" | "circle",
    radius: 1000,
  });

  const handleAddGeofence = () => {
    setEditingGeofence(null);
    setFormData({
      name: "",
      type: "polygon",
      radius: 1000,
    });
    setDialogOpen(true);
  };

  const handleEditGeofence = (geofence: Geofence) => {
    setEditingGeofence(geofence);
    setFormData({
      name: geofence.name,
      type: geofence.type,
      radius: geofence.radius || 1000,
    });
    setDialogOpen(true);
  };

  const handleSaveGeofence = () => {
    if (formData.name.trim() === "") return;

    const geofenceData = {
      name: formData.name.trim(),
      type: formData.type,
      coordinates: editingGeofence?.coordinates || [],
      radius: formData.type === "circle" ? formData.radius : undefined,
      color: "#1890ff20",
      strokeColor: "#1890ff",
      strokeWeight: 2,
    };

    if (editingGeofence) {
      onGeofenceUpdate(editingGeofence.id, geofenceData);
    } else {
      onGeofenceCreate(geofenceData);
    }

    setDialogOpen(false);
    setEditingGeofence(null);
  };

  const handleDeleteGeofence = (id: string) => {
    onGeofenceDelete(id);
    if (selectedGeofence?.id === id) {
      onGeofenceSelect(null);
    }
  };

  const handleDrawingToggle = () => {
    if (!selectedGeofence) {
      setDialogOpen(true);
      return;
    }

    const newDrawingState = !isDrawing;

    // 开始绘制时保存当前展开状态并折叠工具栏
    if (newDrawingState) {
      setWasExpandedBeforeDrawing(expanded);
      setExpanded(false);
    } else {
      // 结束绘制时恢复之前的展开状态
      setExpanded(wasExpandedBeforeDrawing);
    }

    onDrawingToggle(newDrawingState);
  };

  const toggleExpanded = () => {
    // 如果正在绘制中，不允许展开工具栏
    if (isDrawing) return;
    setExpanded(!expanded);
  };

  return (
    <Box
      sx={{
        position: "absolute",
        top: 10,
        left: 10,
        zIndex: 1000,
        padding: expanded ? 1 : 0,
        minWidth: expanded ? 300 : 36,
        maxHeight: expanded ? 400 : 36,
        overflow: "auto",
        transition: "all 0.3s ease",
        backgroundColor: expanded ? "background.paper" : "transparent",

        boxShadow: expanded ? 1 : 0,
      }}
    >
      {/* 折叠状态 - 仅显示图标 */}
      <Box display="flex" alignItems="center">
        <IconButton
          size="small"
          onClick={toggleExpanded}
          disabled={isDrawing}
          sx={{
            width: 36,
            height: 36,
            minWidth: 36,
            backgroundColor: expanded
              ? "transparent"
              : isDrawing
                ? "rgba(255, 193, 7, 0.9)"
                : "rgba(255, 255, 255, 0.9)",
            "&:hover": {
              backgroundColor: isDrawing
                ? "rgba(255, 193, 7, 0.95)"
                : "rgba(255, 255, 255, 0.95)",
            },
            "&.Mui-disabled": {
              backgroundColor: "rgba(255, 193, 7, 0.8)",
              color: "rgba(0, 0, 0, 0.8)",
            },
          }}
        >
          <FenceIcon fontSize="small" />
          {isDrawing && (
            <Box
              sx={{
                position: "absolute",
                top: 2,
                right: 2,
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "warning.main",
                animation: "pulse 1.5s infinite",
              }}
            />
          )}
        </IconButton>
      </Box>

      {/* 展开状态 - 显示完整工具栏 */}
      <Collapse in={expanded}>
        <Box sx={{ mt: 1 }}>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            mb={2}
          >
            <Typography variant="subtitle2" component="h3">
              地理围栏
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAddGeofence}
            >
              新建
            </Button>
          </Box>

          <Box mb={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={isDrawing}
                  onChange={handleDrawingToggle}
                  color="primary"
                  disabled={!selectedGeofence}
                />
              }
              label={isDrawing ? "绘制中（工具栏已折叠）..." : "开始绘制"}
            />
            <Typography
              variant="caption"
              color="textSecondary"
              display="block"
              mt={1}
            >
              {!selectedGeofence
                ? "请先选择或创建一个围栏"
                : isDrawing
                  ? "点击地图绘制围栏区域，双击完成绘制"
                  : "点击开始在地图上绘制围栏区域"}
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              围栏列表 ({geofences.length})
            </Typography>
            {geofences.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                暂无地理围栏
              </Typography>
            ) : (
              geofences.map((geofence) => (
                <Box
                  key={geofence.id}
                  sx={{
                    p: 1,
                    mb: 1,
                    backgroundColor:
                      selectedGeofence?.id === geofence.id
                        ? "#e3f2fd"
                        : "inherit",
                    border:
                      selectedGeofence?.id === geofence.id
                        ? "1px solid #2196f3"
                        : "1px solid #e0e0e0",
                    cursor: "pointer",
                    borderRadius: 1,
                    "&:hover": {
                      backgroundColor: "#f5f5f5",
                    },
                  }}
                  onClick={() =>
                    onGeofenceSelect(
                      selectedGeofence?.id === geofence.id ? null : geofence,
                    )
                  }
                >
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Box flex={1}>
                      <Typography variant="body2" fontWeight="medium">
                        {geofence.name}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                        <Chip
                          label={geofence.type === "circle" ? "圆形" : "多边形"}
                          size="small"
                          variant="outlined"
                        />
                        {geofence.type === "circle" && (
                          <Chip
                            label={`半径: ${geofence.radius}m`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditGeofence(geofence);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteGeofence(geofence.id);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
              ))
            )}
          </Box>
        </Box>
      </Collapse>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingGeofence ? "编辑地理围栏" : "新建地理围栏"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="围栏名称"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>围栏类型</InputLabel>
              <Select
                value={formData.type}
                label="围栏类型"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as "polygon" | "circle",
                  })
                }
              >
                <MenuItem value="polygon">多边形</MenuItem>
                <MenuItem value="circle">圆形</MenuItem>
              </Select>
            </FormControl>
            {formData.type === "circle" && (
              <TextField
                fullWidth
                label="半径（米）"
                type="number"
                value={formData.radius}
                onChange={(e) =>
                  setFormData({ ...formData, radius: Number(e.target.value) })
                }
                margin="normal"
                inputProps={{ min: 10, max: 10000 }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button
            onClick={handleSaveGeofence}
            variant="contained"
            disabled={formData.name.trim() === ""}
          >
            {editingGeofence ? "更新" : "创建"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GeofenceToolbar;
