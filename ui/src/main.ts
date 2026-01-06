import App from './App.svelte';
import '@shoelace-style/shoelace/dist/themes/light.css';
import './app.css';

const app = new App({
  target: document.getElementById('app')!,
});

export default app;
