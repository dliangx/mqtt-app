import packageJson from '../package.json';

const env = {
  appName: import.meta.env.VITE_APP_NAME || 'MQTT IoT Platform',
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
};

// ----------------------------------------------------------------------

export type ConfigValue = {
  appName: string;
  appVersion: string;
  apiUrl: string;
};

export const CONFIG: ConfigValue = {
  appName: env.appName,
  appVersion: packageJson.version,
  apiUrl: env.apiUrl,
};
