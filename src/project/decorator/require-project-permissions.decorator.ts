// decorator/require-project-permissions.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PROJECT_PERMISSIONS_KEY = 'requireProjectPermissions';

/**
 * Décorateur pour spécifier les permissions de projet requises pour accéder à une route
 * @param permissions - Liste des slugs de permissions requises
 */
export const RequireProjectPermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRE_PROJECT_PERMISSIONS_KEY, permissions);

// Exemple d'utilisation:
// @RequireProjectPermissions('project.tasks.create', 'project.tasks.assign')
// async createTask() { ... }