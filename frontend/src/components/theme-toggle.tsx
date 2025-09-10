import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';

import { useTheme } from 'src/theme/theme-context';

import { Iconify } from 'src/components/iconify';

export function ThemeToggle() {
  const { mode, toggleMode } = useTheme();

  return (
    <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
      <IconButton
        onClick={toggleMode}
        color="inherit"
        sx={{
          width: 40,
          height: 40,
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
      >
        <Iconify
          icon={mode === 'light' ? 'solar:eye-closed-bold' : 'solar:eye-bold'}
          width={20}
          sx={{ color: 'text.primary' }}
        />
      </IconButton>
    </Tooltip>
  );
}
