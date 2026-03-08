import { describe, it, expect } from 'vitest';

// Test the route-level auth expectations by verifying the route definitions.
// We import the router and inspect its stack to confirm middleware is applied.

import { adminRouter } from '../routes.js';

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
  return (adminRouter as unknown as { stack: Layer[] }).stack;
}

function findRouteLayer(path: string, method: string): Layer | undefined {
  return getRouteLayers().find(
    (layer) => layer.route?.path === path && layer.route?.methods[method]
  );
}

function getMiddlewareNames(layer: Layer): string[] {
  return layer.route?.stack.map((s) => s.name) ?? [];
}

describe('admin routes auth coverage', () => {
  it('GET /contacts/:incarceratedPersonId requires auth', () => {
    const layer = findRouteLayer('/contacts/:incarceratedPersonId', 'get');
    expect(layer).toBeDefined();
    expect(getMiddlewareNames(layer!)).toContain('requireAuth');
  });

  it('GET /contacts/check requires auth', () => {
    const layer = findRouteLayer('/contacts/check', 'get');
    expect(layer).toBeDefined();
    expect(getMiddlewareNames(layer!)).toContain('requireAuth');
  });

  it('GET /facility/:facilityId requires auth', () => {
    const layer = findRouteLayer('/facility/:facilityId', 'get');
    expect(layer).toBeDefined();
    expect(getMiddlewareNames(layer!)).toContain('requireAuth');
  });

  it('GET /facilities requires auth', () => {
    const layer = findRouteLayer('/facilities', 'get');
    expect(layer).toBeDefined();
    expect(getMiddlewareNames(layer!)).toContain('requireAuth');
  });

  it('GET /housing-unit-type/:unitTypeId requires auth', () => {
    const layer = findRouteLayer('/housing-unit-type/:unitTypeId', 'get');
    expect(layer).toBeDefined();
    expect(getMiddlewareNames(layer!)).toContain('requireAuth');
  });

  it('GET /user/:userId requires auth', () => {
    const layer = findRouteLayer('/user/:userId', 'get');
    expect(layer).toBeDefined();
    expect(getMiddlewareNames(layer!)).toContain('requireAuth');
  });

  it('GET /blocked-numbers/check requires auth', () => {
    const layer = findRouteLayer('/blocked-numbers/check', 'get');
    expect(layer).toBeDefined();
    expect(getMiddlewareNames(layer!)).toContain('requireAuth');
  });
});
