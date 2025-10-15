import { Icon } from '@mui/material';
import {
  Map as MapIcon,
  People as PeopleIcon,
  Devices as DevicesIcon,
  Warning as WarningIcon,
  DataUsage as DataUsageIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

import { Label } from 'src/components/label';
import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => <SvgColor src={`/assets/icons/navbar/${name}.svg`} />;

export type NavItem = {
  title: string;
  path: string;
  icon: React.ReactNode;
  info?: React.ReactNode;
};

export const navData = [
  {
    title: '大屏监控',
    path: '/',
    icon: icon('ic-analytics'),
  },
  {
    title: '地图监控',
    path: '/map-monitor',
    icon: <Icon component={MapIcon} />,
  },
  {
    title: '设备管理',
    path: '/devices',
    icon: <Icon component={DevicesIcon} />,
  },
  {
    title: '消息中心',
    path: '/alerts',
    icon: <Icon component={WarningIcon} />,
  },
  {
    title: '消息类型配置',
    path: '/message-types',
    icon: <Icon component={SettingsIcon} />,
  },
  {
    title: '数据测试',
    path: '/test-data',
    icon: <Icon component={DataUsageIcon} />,
  },
  {
    title: '用户管理',
    path: '/users',
    icon: <Icon component={PeopleIcon} />,
  },
];
