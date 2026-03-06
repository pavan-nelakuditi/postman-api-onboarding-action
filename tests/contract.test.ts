import { readFileSync } from 'node:fs';
import path from 'node:path';

import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '..');

type Step = {
  id?: string;
  name?: string;
  uses?: string;
  with?: Record<string, string>;
};

type ActionManifest = {
  runs: {
    using: string;
    steps: Step[];
  };
  inputs: Record<string, { default?: string; required?: boolean }>;
  outputs: Record<string, { value: string }>;
};

function loadManifest(): ActionManifest {
  return parse(
    readFileSync(path.join(repoRoot, 'action.yml'), 'utf8')
  ) as ActionManifest;
}

describe('postman-api-onboarding-action composite contract', () => {
  it('is a composite action and defaults integration-backend to bifrost', () => {
    const manifest = loadManifest();

    expect(manifest.runs.using).toBe('composite');
    expect(manifest.inputs['integration-backend']?.default).toBe('bifrost');
  });

  it('uses the postman-cs bootstrap and repo-sync actions as steps', () => {
    const manifest = loadManifest();
    const steps = manifest.runs.steps;

    expect(steps).toHaveLength(2);
    expect(steps[0]?.id).toBe('bootstrap');
    expect(steps[0]?.uses).toBe('postman-cs/postman-bootstrap-action@v0');
    expect(steps[1]?.id).toBe('repo_sync');
    expect(steps[1]?.uses).toBe('postman-cs/postman-repo-sync-action@v0');
  });

  it('maps bootstrap outputs explicitly into repo-sync inputs', () => {
    const manifest = loadManifest();
    const repoSyncStep = manifest.runs.steps.find((step) => step.id === 'repo_sync');

    expect(repoSyncStep?.with?.['workspace-id']).toBe(
      '${{ steps.bootstrap.outputs.workspace-id }}'
    );
    expect(repoSyncStep?.with?.['baseline-collection-id']).toBe(
      '${{ steps.bootstrap.outputs.baseline-collection-id }}'
    );
    expect(repoSyncStep?.with?.['smoke-collection-id']).toBe(
      '${{ steps.bootstrap.outputs.smoke-collection-id }}'
    );
    expect(repoSyncStep?.with?.['contract-collection-id']).toBe(
      '${{ steps.bootstrap.outputs.contract-collection-id }}'
    );
  });

  it('surfaces final outputs from bootstrap and repo-sync steps', () => {
    const manifest = loadManifest();

    expect(manifest.outputs['workspace-id']?.value).toBe(
      '${{ steps.bootstrap.outputs.workspace-id }}'
    );
    expect(manifest.outputs['collections-json']?.value).toBe(
      '${{ steps.bootstrap.outputs.collections-json }}'
    );
    expect(manifest.outputs['environment-uids-json']?.value).toBe(
      '${{ steps.repo_sync.outputs.environment-uids-json }}'
    );
    expect(manifest.outputs['repo-sync-summary-json']?.value).toBe(
      '${{ steps.repo_sync.outputs.repo-sync-summary-json }}'
    );
    expect(manifest.outputs['commit-sha']?.value).toBe(
      '${{ steps.repo_sync.outputs.commit-sha }}'
    );
  });
});
