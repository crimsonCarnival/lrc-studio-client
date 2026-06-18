import type { CodegenConfig } from '@graphql-codegen/cli';

/**
 * GraphQL codegen — generates client-side TypeScript types from the backend
 * GraphQL schema. The schema is a committed SDL snapshot (schema.graphql),
 * regenerated from the server via its tsx schema export. Committing both the
 * SDL and the generated types means production builds (Vercel) never need the
 * sibling server checkout.
 *
 * Regenerate after the backend schema changes:
 *   1. (in server) emit fresh SDL to ../client/schema.graphql
 *   2. (here) pnpm codegen
 *
 * Output `src/types/graphql.ts` contains BOTH:
 *   - base schema types (the shared vocabulary: User, Project, Settings, ...),
 *     from the `typescript` plugin.
 *   - per-operation result + variables types (e.g. LeaderboardQuery,
 *     LeaderboardQueryVariables), from `typescript-operations`, generated from
 *     the operations found in `documents`.
 *
 * Crucially, `typescript-operations` validates every operation's field
 * SELECTION against the schema at codegen time — selecting a field that does
 * not exist fails `pnpm codegen`. This catches client/SDL drift at build time
 * (previously only mercurius caught it, at runtime).
 *
 * Operations are picked up from plain template strings tagged with the
 * `/* GraphQL *\/` magic comment (graphql-tag-pluck), so call sites keep
 * passing strings to gqlRequest — no gql tag or document refactor required.
 */
const config: CodegenConfig = {
  schema: './schema.graphql',
  // Scan .js/.jsx too — some components still hold inline operations. Exclude
  // src/types/** so the generated output file isn't scanned as a document.
  documents: ['src/**/*.{ts,tsx,js,jsx}', '!src/types/**'],
  generates: {
    './src/types/graphql.ts': {
      plugins: ['typescript', 'typescript-operations'],
      config: {
        enumsAsTypes: true,
        skipTypename: true,
        useTypeImports: true,
        scalars: { ID: 'string' },
        // strictNullChecks is on; keep nullable fields as `?: T | null`.
        avoidOptionals: false,
      },
    },
  },
};

export default config;
