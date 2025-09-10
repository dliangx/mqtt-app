import type { User } from 'src/types';

import React, { useState, useEffect } from 'react';

import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  Box,
  Paper,
  Table,
  Button,
  Dialog,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  TextField,
  Typography,
  IconButton,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableContainer,
  LinearProgress,
} from '@mui/material';

import { CONFIG } from 'src/config-global';
import { apiService } from 'src/services/api';

import { useSnackbar } from 'src/components/snackbar';

// ----------------------------------------------------------------------

export default function UsersPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [addUserDialog, setAddUserDialog] = useState(false);
  const [editUserDialog, setEditUserDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'user',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiService.getUsers();
      setUsers(Array.isArray(response) ? [...response] : []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      enqueueSnackbar('获取用户列表失败', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    try {
      await apiService.createUser(newUser);
      setAddUserDialog(false);
      setNewUser({
        username: '',
        password: '',
        role: 'user',
      });
      enqueueSnackbar('用户添加成功', { variant: 'success' });
      fetchUsers();
    } catch (err) {
      console.error('Failed to add user:', err);
      enqueueSnackbar('添加用户失败', { variant: 'error' });
    }
  };

  const handleEditUser = async () => {
    if (!currentUser) return;

    try {
      await apiService.updateUser(currentUser.id, {
        username: currentUser.username,
        role: currentUser.role,
      });
      setEditUserDialog(false);
      setCurrentUser(null);
      enqueueSnackbar('用户信息更新成功', { variant: 'success' });
      fetchUsers();
    } catch (err) {
      console.error('Failed to update user:', err);
      enqueueSnackbar('更新用户信息失败', { variant: 'error' });
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('确定要删除这个用户吗？')) return;

    try {
      await apiService.deleteUser(userId);
      enqueueSnackbar('用户删除成功', { variant: 'success' });
      fetchUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
      enqueueSnackbar('删除用户失败', { variant: 'error' });
    }
  };

  const openEditDialog = (user: User) => {
    setCurrentUser(user);
    setEditUserDialog(true);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <LinearProgress sx={{ width: '100%', maxWidth: 400 }} />
      </Box>
    );
  }

  return (
    <>
      <title>{`用户管理 - ${CONFIG.appName}`}</title>

      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">用户管理</Typography>
          <Box display="flex" gap={1}>
            <IconButton onClick={fetchUsers} size="large">
              <RefreshIcon />
            </IconButton>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddUserDialog(true)}
            >
              添加用户
            </Button>
          </Box>
        </Box>

        <Paper sx={{ p: 2 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>用户名</TableCell>
                  <TableCell>角色</TableCell>
                  <TableCell>创建时间</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>
                      <Box
                        component="span"
                        sx={{
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          bgcolor: user.role === 'admin' ? 'primary.main' : 'grey.300',
                          color: user.role === 'admin' ? 'primary.contrastText' : 'text.primary',
                          fontSize: '0.75rem',
                          fontWeight: 'medium',
                        }}
                      >
                        {user.role === 'admin' ? '管理员' : '用户'}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {user.created_at ? new Date(user.created_at).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => openEditDialog(user)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteUser(user.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Add User Dialog */}
        <Dialog
          open={addUserDialog}
          onClose={() => setAddUserDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>添加新用户</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <TextField
                label="用户名"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                required
              />
              <TextField
                label="密码"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                required
              />
              <TextField
                label="角色"
                select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="user">用户</option>
                <option value="admin">管理员</option>
              </TextField>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddUserDialog(false)}>取消</Button>
            <Button
              onClick={handleAddUser}
              variant="contained"
              disabled={!newUser.username || !newUser.password}
            >
              添加
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog
          open={editUserDialog}
          onClose={() => setEditUserDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>编辑用户</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <TextField
                label="用户名"
                value={currentUser?.username || ''}
                onChange={(e) =>
                  setCurrentUser(currentUser ? { ...currentUser, username: e.target.value } : null)
                }
                required
              />
              <TextField
                label="角色"
                select
                value={currentUser?.role || 'user'}
                onChange={(e) =>
                  setCurrentUser(currentUser ? { ...currentUser, role: e.target.value } : null)
                }
                SelectProps={{ native: true }}
              >
                <option value="user">用户</option>
                <option value="admin">管理员</option>
              </TextField>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditUserDialog(false)}>取消</Button>
            <Button onClick={handleEditUser} variant="contained" disabled={!currentUser?.username}>
              保存
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </>
  );
}
