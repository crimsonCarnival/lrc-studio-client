/**
 * Shared type barrel for the client.
 *
 * - `./graphql` is GENERATED from the backend SDL (pnpm codegen) — never edit by
 *   hand. It is the source of truth for everything that crosses the GraphQL API
 *   (User, Project, Settings, ...).
 * - `./api/*` holds hand-written types for the REST surface, which has no schema
 *   to generate from.
 *
 * Import shared types from '@/types' rather than reaching into subpaths.
 */
export type * from './graphql';
export * from './api/error';
