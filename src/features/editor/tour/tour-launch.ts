// In-memory hand-offs between routes for the editor tour. Deliberately not
// persisted: a reload must not replay a stale request.

let newProject = false;
let editorPath: string | null = null;
let replay = false;

export function markNewProject(): void {
  newProject = true;
}

export function consumeNewProject(): boolean {
  const was = newProject;
  newProject = false;
  return was;
}

export function rememberEditorPath(path: string | null): void {
  editorPath = path;
}

export function lastEditorPath(): string | null {
  return editorPath;
}

export function requestTourReplay(): void {
  replay = true;
}

export function consumeTourReplay(): boolean {
  const was = replay;
  replay = false;
  return was;
}
