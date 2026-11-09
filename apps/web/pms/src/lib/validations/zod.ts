import { z } from 'zod';

// Keep validation compatible with CSP policies that disallow dynamic code.
z.config({ jitless: true });

export { z };
