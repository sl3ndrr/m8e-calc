import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig(base, {
  use: {
    trace: {
      mode: 'retain-on-failure',
      screenshots: process.env.AP47_SCREENSHOTS !== '0',
    },
  },
});
