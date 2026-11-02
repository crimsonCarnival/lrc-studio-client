/**
 * Shared type barrel for the client.
 *
 * - `./graphql` mirrors the backend SDL and is HAND-MAINTAINED (codegen was removed;
 *   see its header). Edit it whenever the server schema changes; it is the client's
 *   source of truth for everything that crosses the GraphQL API (User, Project,
 *   Settings, ...).
 * - `./api/*` holds hand-written types for the REST surface, which has no schema
 *   to generate from.
 *
 * Import shared types from '@/types' rather than reaching into subpaths.
 */
export type * from './graphql';
export * from './api/error';
