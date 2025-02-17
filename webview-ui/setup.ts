import { JSDOM } from 'jsdom';

// Create a basic DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
});

// Assign the DOM to global scope
global.document = dom.window.document;
global.window = dom.window;
global.navigator = dom.window.navigator;