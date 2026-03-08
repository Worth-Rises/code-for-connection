import { describe, it, expect } from 'vitest';

import { messagingRouter } from '../routes.js';

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
  return (messagingRouter as unknown as { stack: Layer[] }).stack;
}

function findRouteLayer(path: string, method: string): Layer | undefined {
  return getRouteLayers().find(
    (layer) => layer.route?.path === path && layer.route?.methods[method]
  );
}

function getMiddlewareNames(layer: Layer): string[] {
  return layer.route?.stack.map((s) => s.name) ?? [];
}

describe('messaging routes auth coverage', () => {
  it('GET /logs requires auth and admin role', () => {
    const layer = findRouteLayer('/logs', 'get');
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

  it('GET /pending requires auth and admin role', () => {
    const layer = findRouteLayer('/pending', 'get');
    expect(layer).toBeDefined();
    expect(getMiddlewareNames(layer!)).toContain('requireAuth');
    expect(getMiddlewareNames(layer!)).toContain('requireRole');
  });

  it('POST /approve/:messageId requires auth and admin role', () => {
    const layer = findRouteLayer('/approve/:messageId', 'post');
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
