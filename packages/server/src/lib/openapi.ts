export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'KitchenAsty API',
    version: '1.0.0',
    description: 'REST API for the KitchenAsty restaurant ordering and management system.',
  },
  servers: [
    { url: '/api', description: 'API Server' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http' as const,
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object' as const,
        properties: {
          success: { type: 'boolean' as const, example: false },
          error: { type: 'string' as const },
        },
      },
      Pagination: {
        type: 'object' as const,
        properties: {
          page: { type: 'integer' as const },
          limit: { type: 'integer' as const },
          total: { type: 'integer' as const },
          totalPages: { type: 'integer' as const },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        responses: { '200': { description: 'Service is healthy' } },
      },
    },
    '/auth/customer/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new customer',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' as const, properties: { email: { type: 'string' as const }, password: { type: 'string' as const }, name: { type: 'string' as const }, phone: { type: 'string' as const } }, required: ['email', 'password', 'name'] } } },
        },
        responses: { '201': { description: 'Customer registered' }, '400': { description: 'Validation error' }, '409': { description: 'Email already exists' } },
      },
    },
    '/auth/customer/login': {
      post: {
        tags: ['Auth'],
        summary: 'Customer login',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' as const, properties: { email: { type: 'string' as const }, password: { type: 'string' as const } }, required: ['email', 'password'] } } },
        },
        responses: { '200': { description: 'Login successful' }, '401': { description: 'Invalid credentials' } },
      },
    },
    '/auth/staff/login': {
      post: {
        tags: ['Auth'],
        summary: 'Staff login',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' as const, properties: { email: { type: 'string' as const }, password: { type: 'string' as const } }, required: ['email', 'password'] } } },
        },
        responses: { '200': { description: 'Login successful' }, '401': { description: 'Invalid credentials' } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user info',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'User info' }, '401': { description: 'Not authenticated' } },
      },
    },
    '/locations': {
      get: {
        tags: ['Locations'],
        summary: 'List locations',
        parameters: [
          { name: 'page', in: 'query' as const, schema: { type: 'integer' as const } },
          { name: 'limit', in: 'query' as const, schema: { type: 'integer' as const } },
        ],
        responses: { '200': { description: 'Paginated list of locations' } },
      },
    },
    '/locations/{id}': {
      get: {
        tags: ['Locations'],
        summary: 'Get location by ID',
        parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const } }],
        responses: { '200': { description: 'Location detail' }, '404': { description: 'Not found' } },
      },
    },
    '/menu/categories': {
      get: {
        tags: ['Menu'],
        summary: 'List categories',
        responses: { '200': { description: 'List of categories' } },
      },
    },
    '/menu/items': {
      get: {
        tags: ['Menu'],
        summary: 'List menu items',
        parameters: [
          { name: 'page', in: 'query' as const, schema: { type: 'integer' as const } },
          { name: 'limit', in: 'query' as const, schema: { type: 'integer' as const } },
          { name: 'categoryId', in: 'query' as const, schema: { type: 'string' as const } },
          { name: 'search', in: 'query' as const, schema: { type: 'string' as const } },
        ],
        responses: { '200': { description: 'Paginated list of menu items' } },
      },
    },
    '/menu/items/{id}': {
      get: {
        tags: ['Menu'],
        summary: 'Get menu item by ID',
        parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const } }],
        responses: { '200': { description: 'Menu item detail' }, '404': { description: 'Not found' } },
      },
    },
    '/orders': {
      post: {
        tags: ['Orders'],
        summary: 'Create an order',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' as const, properties: { orderType: { type: 'string' as const, enum: ['DELIVERY', 'PICKUP'] }, items: { type: 'array' as const }, comment: { type: 'string' as const }, scheduledAt: { type: 'string' as const } }, required: ['orderType', 'items'] } } },
        },
        responses: { '201': { description: 'Order created' }, '400': { description: 'Validation error' } },
      },
    },
    '/orders/my-orders': {
      get: {
        tags: ['Orders'],
        summary: 'List customer orders',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query' as const, schema: { type: 'integer' as const } },
        ],
        responses: { '200': { description: 'Paginated customer orders' } },
      },
    },
    '/orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'Get order by ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path' as const, required: true, schema: { type: 'string' as const } }],
        responses: { '200': { description: 'Order detail' }, '404': { description: 'Not found' } },
      },
    },
    '/reservations/availability': {
      get: {
        tags: ['Reservations'],
        summary: 'Check availability',
        parameters: [
          { name: 'locationId', in: 'query' as const, required: true, schema: { type: 'string' as const } },
          { name: 'date', in: 'query' as const, required: true, schema: { type: 'string' as const } },
          { name: 'partySize', in: 'query' as const, schema: { type: 'integer' as const } },
        ],
        responses: { '200': { description: 'Available time slots' } },
      },
    },
    '/reservations': {
      post: {
        tags: ['Reservations'],
        summary: 'Create a reservation',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' as const, properties: { locationId: { type: 'string' as const }, date: { type: 'string' as const }, time: { type: 'string' as const }, partySize: { type: 'integer' as const }, comment: { type: 'string' as const } }, required: ['locationId', 'date', 'time', 'partySize'] } } },
        },
        responses: { '201': { description: 'Reservation created' }, '400': { description: 'Validation error' } },
      },
    },
    '/coupons/validate': {
      post: {
        tags: ['Coupons'],
        summary: 'Validate a coupon code',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' as const, properties: { code: { type: 'string' as const }, subtotal: { type: 'number' as const } }, required: ['code'] } } },
        },
        responses: { '200': { description: 'Coupon valid' }, '400': { description: 'Invalid coupon' }, '404': { description: 'Coupon not found' } },
      },
    },
    '/reviews/location/{locationId}': {
      get: {
        tags: ['Reviews'],
        summary: 'Get location reviews',
        parameters: [
          { name: 'locationId', in: 'path' as const, required: true, schema: { type: 'string' as const } },
          { name: 'page', in: 'query' as const, schema: { type: 'integer' as const } },
        ],
        responses: { '200': { description: 'Approved reviews with average rating' } },
      },
    },
    '/reviews': {
      post: {
        tags: ['Reviews'],
        summary: 'Submit a review',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object' as const, properties: { locationId: { type: 'string' as const }, rating: { type: 'integer' as const, minimum: 1, maximum: 5 }, comment: { type: 'string' as const } }, required: ['locationId', 'rating'] } } },
        },
        responses: { '201': { description: 'Review submitted' } },
      },
    },
  },
};
