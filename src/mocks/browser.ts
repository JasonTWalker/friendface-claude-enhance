import { setupWorker } from 'msw/browser';
import { handlers } from './handlers'

// takes in a bunch of handlers, or presumably, api requests [...handlers]
export const worker = setupWorker(...handlers);