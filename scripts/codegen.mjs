// Regenerates src/types/graphql.ts from the server's GraphQL schema.
// Needs the sibling server checkout (../server) with its dependencies installed.
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const server = resolve(root, '../server');
const run = (cwd, args) => execFileSync('pnpm', args, { cwd, encoding: 'utf8', shell: true, stdio: ['inherit', 'pipe', 'inherit'] });

run(server, ['tsx', 'scripts/print-schema.ts', resolve(root, '.codegen/schema.graphql')]);
console.log(run(root, ['graphql-codegen', '--config', 'codegen.ts']));
