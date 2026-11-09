import type { CodegenConfig } from '@graphql-codegen/cli';

// The schema is the server's SDL, printed by the sibling server repo (see server/scripts/print-schema.ts).
const config: CodegenConfig = {
  schema: [{ './.codegen/schema.graphql': {} }],
  generates: {
    'src/types/graphql.ts': {
      plugins: ['typescript'],
      config: {
        enumsAsTypes: true,
        useTypeImports: true,
        skipTypename: true,
      },
    },
  },
};

export default config;
