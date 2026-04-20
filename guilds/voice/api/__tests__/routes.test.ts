import { describe, it, expect } from 'vitest';

import { voiceRouter } from '../routes.js';

type Layer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: { name: string }[];
  };
  name: string;
  regexp: RegExp;
};

function getRouteLayers(): Layer[] {
  return (voiceRouter as unknown as { stack: Layer[] }).stack;
}

function findRouteLayer(path: string, method: string): Layer | undefined {
  return getRouteLayers().find(
    (layer) => layer.route?.path === path && layer.route?.methods[method]
  );
}

function getMiddlewareNames(layer: Layer): string[] {
  return layer.route?.stack.map((s) => s.name) ?? [];
}

describe('voice routes auth coverage', () => {
  it('GET /call-logs requires auth and admin role', () => {
    const layer = findRouteLayer('/call-logs', 'get');
    expect(layer).toBeDefined();
    expect(getMiddlewareNames(layer!)).toContain('requireAuth');
    expect(getMiddlewareNames(layer!)).toContain('requireRole');
  });

  it('POST /record-usage/:incarceratedPersonId requires auth and admin role', () => {
    const layer = findRouteLayer('/record-usage/:incarceratedPersonId', 'post');
    expect(layer).toBeDefined();
    expect(getMiddlewareNames(layer!)).toContain('requireAuth');
    expect(getMiddlewareNames(layer!)).toContain('requireRole');
  });

  it('GET /active-calls requires auth and admin role', () => {
    const layer = findRouteLayer('/active-calls', 'get');
    expect(layer).toBeDefined();
    expect(getMiddlewareNames(layer!)).toContain('requireAuth');
    expect(getMiddlewareNames(layer!)).toContain('requireRole');
  });

  it('POST /terminate-call/:callId requires auth and admin role', () => {
    const layer = findRouteLayer('/terminate-call/:callId', 'post');
    expect(layer).toBeDefined();
    expect(getMiddlewareNames(layer!)).toContain('requireAuth');
    expect(getMiddlewareNames(layer!)).toContain('requireRole');
  });

  it('GET /stats requires auth and admin role', () => {
    const layer = findRouteLayer('/stats', 'get');
    expect(layer).toBeDefined();
    expect(getMiddlewareNames(layer!)).toContain('requireAuth');
    expect(getMiddlewareNames(layer!)).toContain('requireRole');
  });
});
