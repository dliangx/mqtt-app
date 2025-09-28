import App from './App.svelte';
import type { SvelteComponent } from 'svelte';

const app: SvelteComponent = new App({
  target: document.getElementById('app')!,
  props: {}
});

export default app;
