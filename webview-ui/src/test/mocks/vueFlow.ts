import { vi } from 'vitest'

// Mock the Vue Flow components and utilities
vi.mock('@vue-flow/core', () => ({
  default: {
    name: 'VueFlow',
    template: '<div><slot></slot></div>'
  },
  // Mock other vue-flow exports as needed
  Handle: {
    name: 'Handle',
    template: '<div class="handle"><slot></slot></div>'
  },
  Position: {
    Top: 'top',
    Right: 'right',
    Bottom: 'bottom',
    Left: 'left'
  },
  MarkerType: {
    Arrow: 'arrow',
    ArrowClosed: 'arrowclosed'
  },
  useVueFlow: () => ({
    findNode: vi.fn(),
    getNodes: vi.fn().mockReturnValue([]),
    getEdges: vi.fn().mockReturnValue([]),
    addNodes: vi.fn(),
    addEdges: vi.fn(),
    setNodes: vi.fn(),
    setEdges: vi.fn(),
    updateNodeInternals: vi.fn(),
    updateEdge: vi.fn(),
    removeNodes: vi.fn(),
    removeEdges: vi.fn(),
    project: vi.fn(),
    getIntersectingNodes: vi.fn(),
    isNodeIntersecting: vi.fn(),
    fitView: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    setTransform: vi.fn(),
    getTransform: vi.fn(),
    setCenter: vi.fn(),
    fitBounds: vi.fn(),
    connectionMode: 'strict',
    deleteKeyCode: 'Delete',
    selectionKeyCode: 'Shift',
    multiSelectionKeyCode: 'Meta',
    panActivationKeyCode: 'Space',
    zoomActivationKeyCode: 'Meta'
  })
}))