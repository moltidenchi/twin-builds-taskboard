import { cleanup, render } from '@testing-library/vue';
import { afterEach } from 'vitest';
import App from './App.vue';
import { runAppSpecs } from './test/app.behaviour';

afterEach(cleanup);
runAppSpecs(() => render(App));
