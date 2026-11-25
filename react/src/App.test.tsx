import { cleanup, render } from '@testing-library/react';
import { afterEach } from 'vitest';
import App from './App';
import { runAppSpecs } from './test/app.behaviour';

afterEach(cleanup);
runAppSpecs(() => render(<App />));
