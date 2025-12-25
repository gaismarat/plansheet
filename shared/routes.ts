import { z } from 'zod';
import { insertBlockSchema, insertWorkGroupSchema, insertWorkSchema, insertHolidaySchema, blocks, works, workGroups, holidays } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  blocks: {
    list: {
      method: 'GET' as const,
      path: '/api/blocks',
      responses: {
        200: z.array(z.custom<typeof blocks.$inferSelect & { groups: (typeof workGroups.$inferSelect & { works: (typeof works.$inferSelect)[] })[] }>()),
      },
    },
    unassignedGroups: {
      method: 'GET' as const,
      path: '/api/blocks/unassigned-groups',
      responses: {
        200: z.array(z.custom<typeof workGroups.$inferSelect & { works: (typeof works.$inferSelect)[] }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/blocks',
      input: insertBlockSchema,
      responses: {
        201: z.custom<typeof blocks.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/blocks/:id',
      input: insertBlockSchema.partial(),
      responses: {
        200: z.custom<typeof blocks.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/blocks/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  workGroups: {
    list: {
      method: 'GET' as const,
      path: '/api/work-groups',
      responses: {
        200: z.array(z.custom<typeof workGroups.$inferSelect & { works: (typeof works.$inferSelect)[] }>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/work-groups',
      input: insertWorkGroupSchema,
      responses: {
        201: z.custom<typeof workGroups.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/work-groups/:id',
      input: insertWorkGroupSchema.partial(),
      responses: {
        200: z.custom<typeof workGroups.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/work-groups/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  works: {
    create: {
      method: 'POST' as const,
      path: '/api/works',
      input: insertWorkSchema,
      responses: {
        201: z.custom<typeof works.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/works/:id',
      input: insertWorkSchema.partial(),
      responses: {
        200: z.custom<typeof works.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    moveUp: {
      method: 'POST' as const,
      path: '/api/works/:id/move-up',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    moveDown: {
      method: 'POST' as const,
      path: '/api/works/:id/move-down',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/works/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  holidays: {
    list: {
      method: 'GET' as const,
      path: '/api/holidays',
      responses: {
        200: z.array(z.custom<typeof holidays.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/holidays',
      input: insertHolidaySchema,
      responses: {
        201: z.custom<typeof holidays.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    toggle: {
      method: 'POST' as const,
      path: '/api/holidays/toggle',
      input: z.object({ date: z.string() }),
      responses: {
        200: z.object({ isHoliday: z.boolean() }),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/holidays/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
};

// ============================================
// HELPER
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

// ============================================
// TYPE HELPERS
// ============================================
export type WorkGroupInput = z.infer<typeof api.workGroups.create.input>;
export type WorkInput = z.infer<typeof api.works.create.input>;
export type WorkUpdateInput = z.infer<typeof api.works.update.input>;
