import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const workflow = readFileSync(join(repositoryRoot, '.github', 'workflows', 'release.yml'), 'utf8');
const verifier = readFileSync(join(repositoryRoot, 'scripts', 'verify-release.mjs'), 'utf8');
const makefile = readFileSync(join(repositoryRoot, 'Makefile'), 'utf8');
const changelog = readFileSync(join(repositoryRoot, 'CHANGELOG.md'), 'utf8');
const readme = readFileSync(join(repositoryRoot, 'README.md'), 'utf8');
const roadmap = readFileSync(join(repositoryRoot, 'docs', 'ROADMAP.md'), 'utf8');
const decisions = readFileSync(join(repositoryRoot, 'docs', 'DECISIONS.md'), 'utf8');
const testingStrategy = readFileSync(join(repositoryRoot, 'docs', 'TESTING_STRATEGY.md'), 'utf8');
const releaseTemplate = readFileSync(
  join(repositoryRoot, '.github', 'RELEASE_TEMPLATE.md'),
  'utf8',
);
const packageVerifier = readFileSync(join(repositoryRoot, 'scripts', 'verify-package.mjs'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(repositoryRoot, 'package.json'), 'utf8')) as {
  name: string;
  version: string;
  files: string[];
  bin: Record<string, string>;
  scripts: Record<string, string>;
};
const currentReleaseNotes = readFileSync(
  join(repositoryRoot, '.github', `RELEASE_NOTES_v${packageJson.version}.md`),
  'utf8',
);

void test('release workflow publishes only from a tagged commit after approval', () => {
  assert.match(workflow, /^[ ]{2}push:\n[ ]{4}tags:\n[ ]{6}- 'v\*'$/m);
  assert.doesNotMatch(workflow, /^[ ]{4}branches:/m);
  assert.match(workflow, /environment:\n[ ]{6}name: npm-release/);
  assert.match(workflow, /^[ ]{6}id-token: write$/m);
  assert.match(
    workflow,
    /if: github\.event_name == 'push' && startsWith\(github\.ref, 'refs\/tags\/v'\)/,
  );
  assert.match(workflow, /github\.ref_name != 'v0\.1\.0'/);
  assert.equal(workflow.match(/npm publish --access public/g)?.length, 1);
  assert.doesNotMatch(workflow, /--provenance/);
  assert.match(workflow, /npm audit signatures --prefix/);
});

void test('post-publish verification waits for registry visibility', () => {
  const waitStep = 'name: Wait for published version to become visible';
  const install = 'npm install --prefix "$check_dir"';

  assert.ok(workflow.includes(waitStep), 'workflow omits registry visibility wait');
  assert.match(workflow, /npm view "\$\{package_name\}@\$\{version\}" version --prefer-online/);
  assert.match(workflow, /for \(\(attempt = 1; attempt <= 12; attempt\+\+\)\)/);
  assert.match(workflow, /sleep 15/);
  assert.ok(workflow.indexOf(waitStep) < workflow.indexOf(install));
  assert.match(workflow, /npm install [^\n]*--prefer-online/);
  assert.match(decisions, /^## ADR-070 — Bounded registry visibility wait after publish$/m);
  assert.match(testingStrategy, /^### Release workflow registry visibility wait/m);
});

void test('release workflow uses pinned actions and no npm token', () => {
  assert.doesNotMatch(workflow, /secrets\./);
  assert.doesNotMatch(workflow, /NPM_TOKEN|NODE_AUTH_TOKEN|_authToken/);

  const actions = [...workflow.matchAll(/uses:\s+(\S+)/g)].map((match) => match[1]);
  assert.ok(
    actions.length >= 4,
    'expected both jobs to use pinned checkout and setup-node actions',
  );
  for (const action of actions) {
    assert.match(action, /^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/);
  }
});

void test('release verifier is wired into npm and make, and checks package parity', () => {
  assert.equal(
    packageJson.scripts['verify:release'],
    'npm run build && node scripts/verify-release.mjs',
  );
  assert.match(makefile, /^verify-release:\t##/m);
  assert.match(verifier, /refs\/tags\//);
  assert.match(verifier, /status.*--porcelain/);
  assert.match(verifier, /npm.*pack.*--dry-run/);
  assert.match(verifier, /npm.*publish.*--dry-run/);
  assert.match(verifier, /RELEASE_OPERATOR/);
});

void test('release verifier switches from dry-run parity to published registry parity', () => {
  assert.match(verifier, /function readPublishedMetadata/);
  assert.match(verifier, /npm.*view.*--json/);
  assert.match(verifier, /details\?\.error\?\.code === 'E404'/);
  assert.match(verifier, /function assertPublishedIdentity/);
  assert.match(verifier, /const published = readPublishedMetadata\(expectedVersion\)/);
  assert.match(verifier, /if \(published\)/);
  assert.match(
    verifier,
    /assertPublishedIdentity\(pack, published, expectedVersion, gitState\.head\)/,
  );
  for (const field of ['gitHead', 'shasum', 'integrity', 'fileCount']) {
    assert.match(verifier, new RegExp(field));
  }
  assert.match(verifier, /published artifact identity verified; no package was published/);
  assert.match(
    workflow,
    /Version to validate \(X\.Y\.Z\); published versions require an immutable release ref/,
  );
  assert.match(
    workflow,
    /ref:\s+\$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.ref \|\| github\.ref \}\}/,
  );
  assert.match(workflow, /Git ref to check out \(defaults to the dispatch ref\)/);
  assert.match(verifier, /npm rejects even a publish dry-run/);
  assert.match(decisions, /^## ADR-062 — Publication-state-aware release verification$/m);
  assert.match(testingStrategy, /^### Post-publication verification hardening/m);
});

void test('changelog and current release notes match the candidate manifest without claiming publication', () => {
  const version = packageJson.version.replaceAll('.', '\\.');
  assert.equal(packageJson.version, '0.5.0');
  assert.match(changelog, new RegExp(`^## \\[${version}\\] - \\d{4}-\\d{2}-\\d{2}$`, 'm'));
  assert.match(changelog, /^## \[Unreleased\]$/m);
  assert.match(changelog, /^### Known issues$/m);
  assert.ok(currentReleaseNotes.includes(`${packageJson.name}@${packageJson.version}`));
  assert.match(currentReleaseNotes, /@strudel\/reference@1\.2\.2/);
  assert.match(currentReleaseNotes, /Node\.js 24 or 26 with npm 11/);
  assert.match(currentReleaseNotes, /^## Explicit limitations and known issues$/m);
  assert.match(currentReleaseNotes, /^## Installed-package verification$/m);
  assert.match(currentReleaseNotes, /^## Corrections and rollback$/m);
  assert.match(currentReleaseNotes, /candidate only; not published/);
});

void test('post-publication smoke plan covers registry, installed launch and release record', () => {
  assert.match(decisions, /^## ADR-046 — Post-publication smoke plan$/m);
  assert.match(testingStrategy, /^### Post-publication smoke plan/m);

  for (const heading of [
    'Git and GitHub release record',
    'Public registry metadata and licence',
    'Clean-machine install',
    'Installed stdio handshake',
    'Evidence and failure handling',
  ]) {
    assert.ok(testingStrategy.includes(heading), `smoke plan omits: ${heading}`);
  }
});

void test('Phase 13 authorization records the exact version and operator', () => {
  const marker = '## ADR-047 — Phase 13 release authorization';
  const start = decisions.indexOf(marker);
  assert.notEqual(start, -1);
  const section = decisions.slice(start);
  assert.match(section, /publish exactly `strudel-lsp-server@0\.1\.0`/);
  assert.match(section, /`pedrozappa` as the named release operator/);
});

void test('Phase 15 authorization and evidence record the exact published release', () => {
  const authorizationMarker = '## ADR-060 — Phase 15 controlled publication authorization';
  const authorizationStart = decisions.indexOf(authorizationMarker);
  assert.notEqual(authorizationStart, -1);
  const authorization = decisions.slice(authorizationStart);
  assert.match(authorization, /exactly `strudel-lsp-server@0\.2\.0`/);
  assert.match(authorization, /tagging exactly `v0\.2\.0`/);
  assert.match(authorization, /`pedrozappa` as the named release operator/);
  assert.match(authorization, /controlled OIDC workflow/);
  assert.match(authorization, /ADR-049 applies only to `0\.1\.0`/);

  const evidenceMarker = '## ADR-061 — Phase 15 publication and smoke evidence';
  const evidenceStart = decisions.indexOf(evidenceMarker);
  assert.notEqual(evidenceStart, -1);
  const evidence = decisions.slice(evidenceStart);
  assert.match(evidence, /46038153400/);
  assert.match(evidence, /SLSA v1/);
  assert.match(evidence, /7d611a8d61dae2ab2eea21a12ce2ebdec59e4488/);
  assert.match(evidence, /[Nn]o deprecation, dist-tag change, unpublish or retag/);
});

void test('Phase 19 authorization records the exact version tag and operator', () => {
  const marker = '## ADR-066 — Phase 19 controlled publication authorization';
  const start = decisions.indexOf(marker);
  assert.notEqual(start, -1);
  const authorization = decisions.slice(start);
  assert.match(authorization, /exactly `strudel-lsp-server@0\.3\.0`/);
  assert.match(authorization, /tagging exactly `v0\.3\.0`/);
  assert.match(authorization, /`pedrozappa` as the named release operator/);
  assert.match(authorization, /controlled OIDC workflow/);
  assert.match(authorization, /ADR-049 applies only to `0\.1\.0`/);
  assert.match(authorization, /RELEASE_NOTES_v0\.3\.0\.md/);
  assert.match(authorization, /does not permit a local publish/);
});

void test('Phase 19 publication evidence records the exact release and completed phase', () => {
  const marker = '## ADR-067 — Phase 19 publication and smoke evidence';
  const start = decisions.indexOf(marker);
  assert.notEqual(start, -1);
  const evidence = decisions.slice(start);
  assert.match(evidence, /b3451e283986b576b526534136026adba0bf5217/);
  assert.match(evidence, /787fccb333e5c03bd6615f17167c252db440d5d9/);
  assert.match(evidence, /46049593155/);
  assert.match(evidence, /140677309030/);
  assert.match(evidence, /140677717483/);
  assert.match(evidence, /ETARGET/);
  assert.match(evidence, /8ad0ac52f1443648c38b372532d0f2d5306e72d7/);
  assert.match(evidence, /SLSA v1/);
  assert.match(evidence, /No local publish, republish/);
  assert.match(roadmap, /^### Phase 19 — `v0\.3\.0` controlled release \(complete\)$/m);
  assert.match(changelog, /Version `0\.3\.0` was published on 2026-11-27/);
  // The README is live documentation and must name the registry release, not the unpublished candidate.
  assert.match(readme, /latest published version is `0\.4\.0`/);
  assert.match(readme, /candidate manifest is `0\.5\.0`/);
});

void test('Phase 22 authorization records the exact version tag and operator', () => {
  const marker = '## ADR-071 — Phase 22 controlled publication authorization';
  const start = decisions.indexOf(marker);
  assert.notEqual(start, -1);
  const authorization = decisions.slice(start);
  assert.match(authorization, /exactly `strudel-lsp-server@0\.4\.0`/);
  assert.match(authorization, /tagging exactly `v0\.4\.0`/);
  assert.match(authorization, /`pedrozappa` as the named release operator/);
  assert.match(authorization, /controlled OIDC workflow/);
  assert.match(authorization, /RELEASE_NOTES_v0\.4\.0\.md/);
  assert.match(authorization, /does not permit a local publish/);
  assert.match(roadmap, /^### Phase 22 — `v0\.4\.0` controlled release \(complete\)$/m);
});

void test('Phase 22 publication evidence records the exact release and completed phase', () => {
  const marker = '## ADR-072 — Phase 22 publication and smoke evidence';
  const start = decisions.indexOf(marker);
  assert.notEqual(start, -1);
  const evidence = decisions.slice(start);
  assert.match(evidence, /1d39c14cba2152116ce1c2c5d5b827bf6af5c144/);
  assert.match(evidence, /46063508701/);
  assert.match(evidence, /140723175749/);
  assert.match(evidence, /140723461085/);
  assert.match(evidence, /visible \(attempt 8\)/);
  assert.match(evidence, /cf6a8eff2b4dc1c3cbbb110b1605d6c871229173/);
  assert.match(
    evidence,
    /sha512-vneHfd0M\/nl1QdEP3F6nra4\+BMODFiz0kAtUs6m78uNiYDzaY9xIwFCzmQlD6F3dXV0CWUhvvCyhkhABIWvtfA==/,
  );
  assert.match(evidence, /SLSA v1/);
  assert.match(evidence, /No local publish, republish/);
  assert.match(roadmap, /^### Phase 22 — `v0\.4\.0` controlled release \(complete\)$/m);
  assert.match(changelog, /Version `0\.4\.0` was published on 2026-11-27/);
});

void test('first-publish bootstrap exception is version-limited and blocks workflow publishing', () => {
  const marker = '## ADR-049 — First-publish bootstrap exception';
  const start = decisions.indexOf(marker);
  assert.notEqual(start, -1);
  const section = decisions.slice(start);
  assert.match(section, /exactly `strudel-lsp-server@0\.1\.0`/);
  assert.match(section, /operator-managed publish/);
  assert.match(section, /no workflow publish for `v0\.1\.0`/);
  assert.match(section, /provenance attestation for `0\.1\.0` is not assumed/);
  assert.match(workflow, /github\.ref_name != 'v0\.1\.0'/);
  assert.equal(workflow.match(/npm publish --access public/g)?.length, 1);
});

void test('Phase 25 candidate artifacts do not claim an unpublished release', () => {
  const candidateNotes = readFileSync(
    join(repositoryRoot, '.github', 'RELEASE_NOTES_v0.5.0.md'),
    'utf8',
  );
  assert.match(candidateNotes, /^Draft release notes for `strudel-lsp-server@0\.5\.0`/m);
  assert.match(candidateNotes, /candidate only; not published/m);
  assert.match(candidateNotes, /^## Publication status$/m);
  assert.match(candidateNotes, /No publication is authorized/);

  const marker = '## ADR-075 — Phase 25 controlled publication authorization (draft)';
  const start = decisions.indexOf(marker);
  assert.notEqual(start, -1);
  const section = decisions.slice(start);
  assert.match(section, /Status: draft/);
  assert.match(section, /No publication is authorized/);
  assert.match(section, /named operator stated in that authorization/);
  assert.match(section, /explicit user authorization/);
  assert.match(section, /The manifest declares `0\.5\.0` as a candidate/);

  assert.match(
    roadmap,
    /^### Phase 25 — `v0\.5\.0` controlled release \(candidate prepared, awaiting publication authorization\)$/m,
  );
});

void test('Phase 17 records the package, support and SBOM readiness decisions', () => {
  assert.deepEqual(packageJson.files, ['dist/src', 'LICENSE']);
  assert.equal(packageJson.bin['strudel-lsp-server'], './dist/src/server.js');
  assert.doesNotMatch(JSON.stringify(packageJson.scripts), /sbom|cyclonedx|spdx/i);

  const marker = '## ADR-064 — Release readiness: package contents, support guidance and SBOM';
  const start = decisions.indexOf(marker);
  assert.notEqual(start, -1);
  const section = decisions.slice(start);
  assert.match(section, /retain `package\.json` `files` as exactly `\['dist\/src', 'LICENSE'\]`/);
  assert.match(
    section,
    /do not generate an SBOM or add a new release attestation tool in Phase 17/,
  );
  assert.match(section, /Phase 26 reviews this decision/);

  assert.match(
    packageVerifier,
    /const allowedPrefixes = \['LICENSE', 'README\.md', 'package\.json', 'dist\/src\/'\]/,
  );
  assert.match(
    verifier,
    /JSON\.stringify\(packageJson\.files\) !== JSON\.stringify\(\['dist\/src', 'LICENSE'\]\)/,
  );
});

void test('README support guidance collects safe reproduction evidence', () => {
  const marker = '## Reporting problems';
  const start = readme.indexOf(marker);
  assert.notEqual(start, -1);
  const section = readme.slice(start, readme.indexOf('## Repository and support'));

  for (const required of [
    'npm ls strudel-lsp-server',
    'node --version',
    'npm --version',
    'Operating system and architecture',
    'editor or LSP client',
    'minimal `.strudel` snippet',
    'diagnostic code, message and source range',
    'client LSP trace or server stderr',
    'Do not paste raw server stdout',
    'Redact tokens, passwords, OTP or recovery codes, private keys',
  ]) {
    assert.ok(section.includes(required), `support guidance omits: ${required}`);
  }
});

void test('Phase 17 completion and the historical release body are contractually preserved', () => {
  assert.match(
    roadmap,
    /^### Phase 17 — Documentation, packaging and support readiness \(complete, `v0\.3\.0`\)$/m,
  );
  const start = roadmap.indexOf('### Phase 17 — Documentation, packaging and support readiness');
  assert.notEqual(start, -1);
  const phase = roadmap.slice(start, roadmap.indexOf('### Phase 18 —', start));
  assert.doesNotMatch(phase, /^- \[ \]/m);
  assert.match(phase, /ADR-064/);

  assert.match(releaseTemplate, /^Release notes for `strudel-lsp-server@0\.2\.0`/m);
  assert.match(releaseTemplate, /138-file tarball/);
  assert.match(releaseTemplate, /86\/86 tests/);
  assert.doesNotMatch(
    releaseTemplate,
    /Phase 1[6-9]|Phase 2[0-7]|`v0\.3\.0`|`v0\.4\.0`|`v0\.5\.0`|`v1\.0\.0`/,
  );
});
