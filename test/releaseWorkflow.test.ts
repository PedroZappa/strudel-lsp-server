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
const roadmapArchive = readFileSync(join(repositoryRoot, 'docs', 'ROADMAP_ARCHIVE.md'), 'utf8');
const decisions = readFileSync(join(repositoryRoot, 'docs', 'DECISIONS.md'), 'utf8');
const testingStrategy = readFileSync(join(repositoryRoot, 'docs', 'TESTING_STRATEGY.md'), 'utf8');
const performanceDoc = readFileSync(join(repositoryRoot, 'docs', 'PERFORMANCE.md'), 'utf8');
const featuresDoc = readFileSync(join(repositoryRoot, 'docs', 'LSP_FEATURES.md'), 'utf8');
const architectureDoc = readFileSync(join(repositoryRoot, 'docs', 'ARCHITECTURE.md'), 'utf8');
const serverSource = readFileSync(join(repositoryRoot, 'src', 'server.ts'), 'utf8');
const capabilityContract = readFileSync(
  join(repositoryRoot, 'test', 'lsp', 'frozenBaselineContract.test.ts'),
  'utf8',
);
const serverTest = readFileSync(join(repositoryRoot, 'test', 'server.test.ts'), 'utf8');
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
const packageLock = JSON.parse(readFileSync(join(repositoryRoot, 'package-lock.json'), 'utf8')) as {
  version: string;
  packages: Record<string, { version?: string }>;
};
const currentReleaseNotes = readFileSync(
  join(repositoryRoot, '.github', `RELEASE_NOTES_v${packageJson.version}.md`),
  'utf8',
);

void test('active roadmap contains only post-v1 planning and links the completed-phase archive', () => {
  assert.match(roadmap, /^# Roadmap$/m);
  assert.match(roadmap, /^Status: `v1\.0\.0` is published/m);
  assert.match(roadmap, /\[roadmap archive\]\(ROADMAP_ARCHIVE\.md\)/);
  assert.match(roadmap, /^### Phase 28 — v1\.1 live-coding semantics/m);
  assert.match(roadmap, /^### Phase 29 — v1\.x protocol efficiency/m);
  assert.match(roadmap, /^### Phase 30 — v1\.x semantic depth and workspace navigation/m);
  assert.match(roadmap, /^### Phase 31 — v1\.x compatibility and release engineering/m);
  assert.doesNotMatch(roadmap, /^### Phase (?:[0-9]|1[0-9]|2[0-7]) —/m);
  assert.doesNotMatch(roadmap, /^- \[x\]/m);
  assert.match(roadmap, /workspace\/didChangeWorkspaceFolders/);
  assert.match(roadmap, /signature-help `range`/);
  assert.match(roadmap, /optional, rest and overloaded parameters/);
  assert.match(roadmap, /bounded cross-file rename/);

  assert.match(roadmapArchive, /^# Roadmap archive — completed phases through v1\.0\.0$/m);
  for (let phase = 0; phase <= 27; phase += 1) {
    assert.match(roadmapArchive, new RegExp(`^#{2,3} Phase ${phase} —`, 'm'));
  }
  assert.match(roadmapArchive, /^### Phase 27 — `v1\.0\.0` controlled release \(complete\)$/m);
  assert.match(roadmapArchive, /Phase 27 published that exact commit/m);

  const agents = readFileSync(join(repositoryRoot, 'AGENTS.md'), 'utf8');
  for (const document of [agents, decisions, testingStrategy, featuresDoc, performanceDoc]) {
    assert.match(document, /ROADMAP_ARCHIVE\.md/);
  }
});

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

void test('release validation job mirrors the full CI gate', () => {
  const requiredCommands = [
    'npm run typecheck',
    'npm run lint',
    'npm run format:check',
    'npm test',
    'npm run test:parser',
    'npm run test:semantic',
    'npm run test:metadata',
    'npm run test:configuration',
    'npm run test:lsp',
    'npm run test:features',
    'npm run test:mini',
    'npm run test:protocol',
    'npm run test:soak',
    'npm run validate:corpus',
    'npm run build',
    'npm run verify:contents',
    'npm run verify:package',
    'npm run verify:consumer',
    'npm run benchmark:check',
    'npm run benchmark:e2e',
    'npm audit --omit=dev',
    'npm audit',
    'npm audit --prefix client',
  ];
  for (const command of requiredCommands) {
    assert.ok(workflow.includes(`run: ${command}\n`), `release workflow omits: ${command}`);
  }

  assert.match(
    workflow,
    /name: Run advisory benchmark regression check\n\s+continue-on-error: true\n\s+run: npm run benchmark:check/,
  );
  assert.match(
    workflow,
    /name: Run advisory installed-binary JSON-RPC benchmark\n\s+continue-on-error: true\n\s+run: npm run benchmark:e2e/,
  );
  assert.match(
    workflow,
    /name: Audit all dependencies\n\s+continue-on-error: true\n\s+run: npm audit\n/,
  );
  assert.match(workflow, /timeout-minutes: 45/);
  assert.match(roadmapArchive, /^Phase 26 release workflow evidence:/m);
  assert.match(testingStrategy, /^## Phase 26 release workflow gate alignment/m);
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

void test('changelog and current release notes match the release manifest', () => {
  const version = packageJson.version.replaceAll('.', '\\.');
  assert.equal(packageJson.version, '1.0.0');
  assert.equal(packageLock.version, '1.0.0');
  assert.equal(packageLock.packages['']?.version, '1.0.0');
  assert.match(changelog, new RegExp(`^## \\[${version}\\] - \\d{4}-\\d{2}-\\d{2}$`, 'm'));
  assert.match(changelog, /^## \[Unreleased\]$/m);
  assert.match(changelog, /^### Known issues$/m);
  assert.ok(currentReleaseNotes.includes(`${packageJson.name}@${packageJson.version}`));
  assert.match(currentReleaseNotes, /@strudel\/reference@1\.2\.2/);
  assert.match(currentReleaseNotes, /Node\.js 24 or 26 with npm 11/);
  assert.match(currentReleaseNotes, /^## Explicit limitations and known issues$/m);
  assert.match(currentReleaseNotes, /^## Verification$/m);
  assert.match(currentReleaseNotes, /^## Corrections and rollback$/m);
  assert.match(currentReleaseNotes, /^## Publication record$/m);
  assert.match(currentReleaseNotes, /Published by operator `pedrozappa`/);
  assert.doesNotMatch(currentReleaseNotes, /Not published/);
});

void test('Phase 26 prepares candidate-only v1 changelog and release notes', () => {
  const marker = '## ADR-081 — Phase 26 candidate changelog and release notes preparation';
  const start = decisions.indexOf(marker);
  assert.notEqual(start, -1);
  const section = decisions.slice(start);

  assert.match(
    section,
    /Bump `package\.json` and the two root version fields in `package-lock\.json` to `1\.0\.0`/,
  );
  assert.match(
    section,
    /No tag, registry mutation, capability re-freeze or GitHub release is performed/,
  );
  assert.match(section, /ADR-082 supersedes only the unadvertised disposition/);
  assert.match(section, /exact authorization ADR naming/);

  assert.match(changelog, /^## \[1\.0\.0\] - 2026-11-28$/m);
  assert.match(section, /Both state that the version is not published and not tagged/);
  assert.match(
    section,
    /No signature, provenance, public-registry install or installed stdio evidence is claimed before that workflow runs/,
  );
  assert.match(section, /ADR-082 supersedes only the unadvertised disposition/);
  assert.match(currentReleaseNotes, /^Release notes for `strudel-lsp-server@1\.0\.0`/m);
  assert.match(currentReleaseNotes, /ADR-082/);
  assert.match(currentReleaseNotes, /documentHighlight/);
  assert.doesNotMatch(currentReleaseNotes, /codeLens|inlineValues/);
  assert.doesNotMatch(currentReleaseNotes, /138-file|86\/86/);
  assert.match(
    roadmapArchive,
    /^- \[x\] Prepare versioned changelog and GitHub release notes from the exact candidate, without reusing/m,
  );
});

void test('Phase 26 re-freezes v1 with all ADR-077 additions advertised', () => {
  const marker = '## ADR-082 — Phase 26 final v1 capability re-freeze';
  const start = decisions.indexOf(marker);
  assert.notEqual(start, -1);
  const section = decisions.slice(start);

  assert.match(section, /advertise all four ADR-077 additions/);
  assert.match(section, /documentHighlightProvider: true/);
  assert.match(
    section,
    /Keep the deliberately unsupported surface exact: declaration, type definition, implementation, document link, color, code lens, on-type formatting, linked editing, inline value, moniker and pull diagnostics remain unadvertised/,
  );
  assert.match(section, /adds no diagnostic code and no generated metadata change/);
  assert.match(section, /does not authorize version `1\.0\.0`, tag `v1\.0\.0`, publication/);

  assert.match(serverSource, /documentHighlightProvider: true/);
  assert.match(capabilityContract, /documentHighlightProvider: true/);
  assert.doesNotMatch(capabilityContract, /'documentHighlightProvider',/);
  assert.match(capabilityContract, /re-frozen v1\.0\.0 capability matrix/);
  assert.match(
    serverTest,
    /assert\.equal\(initializeResult\.capabilities\.documentHighlightProvider, true\)/,
  );
  assert.match(featuresDoc, /ADR-077 step-context work \(advertised in v1 by ADR-082\)/);
  assert.match(architectureDoc, /ADR-082 re-freezes the v1 contract/);
  assert.match(changelog, /ADR-077 v1 capabilities are advertised under ADR-082/);
  assert.match(
    roadmapArchive,
    /^- \[x\] Every ADR-077 v1 addition is implemented, advertised and verified under ADR-082/m,
  );
});

void test('Phase 26 exact v1 candidate audit records the local tag identity and gates', () => {
  const marker = '## ADR-083 — Phase 26 exact `v1.0.0` candidate audit';
  const start = decisions.indexOf(marker);
  assert.notEqual(start, -1);
  const section = decisions.slice(start);

  assert.match(section, /447736d3d1664e34d17e9fe6b5394e64f4327518/);
  assert.match(section, /The tag was not pushed/);
  assert.match(section, /171 entries and 189,614 bytes/);
  assert.match(section, /exact-pinned, installed at the declared version/);
  assert.match(section, /zero npm\/GitHub token prefixes/);
  assert.match(section, /zero probe hits/);
  assert.match(section, /172\/172 tests/);
  assert.match(section, /No registry mutation, GitHub release, signature, provenance attestation/);
  assert.match(section, /not part of the tagged tree/);

  assert.match(
    roadmapArchive,
    /^- \[x\] The full candidate gate is green on the exact commit proposed for `v1\.0\.0`\. ADR-083 records 172\/172 at commit `447736d3`\.$/m,
  );
  assert.match(
    roadmapArchive,
    /^- \[x\] The v1 tag contains ADR-062 verification and the final capability contract tests\.$/m,
  );
  assert.match(
    roadmapArchive,
    /^- \[x\] Repeat dependency, licence, provenance and secret audits on the exact v1 candidate\. ADR-083/m,
  );
  assert.match(testingStrategy, /^## Phase 26 exact local `v1\.0\.0` candidate audit$/m);
  assert.match(testingStrategy, /post-audit working-tree gate is 174\/174/);
  assert.match(performanceDoc, /ADR-083 records the exact tagged gate/);
  assert.match(changelog, /ADR-083 records the exact local `v1\.0\.0` tag audit/);
  assert.match(currentReleaseNotes, /ADR-083 records the exact local-tag audit/);
});

void test('Phase 27 records exact publication authorization and completed publication', () => {
  const marker = '## ADR-084 — Phase 27 controlled publication authorization';
  const start = decisions.indexOf(marker);
  assert.notEqual(start, -1);
  const section = decisions.slice(start);

  assert.match(section, /Status: accepted on 2026-11-28/);
  assert.match(section, /publication of exactly `strudel-lsp-server@1\.0\.0`/);
  assert.match(section, /exactly local tag `v1\.0\.0`/);
  assert.match(section, /commit `447736d3d1664e34d17e9fe6b5394e64f4327518`/);
  assert.match(section, /`pedrozappa` as the named release operator/);
  assert.match(section, /controlled OIDC workflow and `npm-release` approval/);
  assert.match(section, /does not permit a local publish/);
  assert.match(
    section,
    /does not itself push the tag, start the workflow, publish a package or create a GitHub release/,
  );

  assert.match(roadmapArchive, /^### Phase 27 — `v1\.0\.0` controlled release \(complete\)$/m);
  assert.match(
    roadmapArchive,
    /^- \[x\] Obtain explicit authorization for exactly `1\.0\.0`, exactly `v1\.0\.0` and the named operator\. ADR-084 records/m,
  );
  assert.match(
    roadmapArchive,
    /Phase 27 published that exact commit through the controlled OIDC workflow under ADR-084, with evidence in ADR-085/,
  );
  assert.match(
    section,
    /explicitly authorized publication of exactly `strudel-lsp-server@1\.0\.0`/,
  );
  assert.match(currentReleaseNotes, /ADR-084 records the exact publication authorization/);
  assert.match(changelog, /ADR-084 authorizes the exact controlled publication/);
});

void test('Phase 27 records controlled publication evidence without unapproved mutations', () => {
  const marker = '## ADR-085 — Phase 27 `1.0.0` publication evidence';
  const start = decisions.indexOf(marker);
  assert.notEqual(start, -1);
  const section = decisions.slice(start);

  for (const required of [
    '46139316105',
    '140962208074',
    '140962206772',
    '68615060',
    'bdc983ab680d6a012f4eff397ae5ed4b9cf1ae25',
    '447736d3d1664e34d17e9fe6b5394e64f4327518',
    '8ac2d097670c0df351c0be0f13f4176a27b3867f',
    'sha512-iFie0YnRQA0MFSyu/9oMwEpz86Bg8Ts5fFJ4mVkQcUIF68vdEpcRMpxNVI37k2BKD8sHm+HzYg35tLSyMyFdhg==',
    'SLSA v1',
    'refs/tags/v1.0.0',
    'invalid: []',
    'missing: []',
    'Node `v26.8.2`',
    'npm `11.19.1`',
  ]) {
    assert.ok(section.includes(required), `publication evidence omits: ${required}`);
  }
  assert.match(section, /no local publish, republish or credential handling occurred/i);
  assert.match(
    section,
    /No deprecation, manual dist-tag change, unpublish, retag, second publish or other registry mutation occurred/,
  );
  assert.match(testingStrategy, /^## Phase 27 `v1\.0\.0` publication evidence$/m);
  assert.match(
    testingStrategy,
    /All ADR-046 smoke checks passed before release-record publication/,
  );
  assert.match(currentReleaseNotes, /^## Publication record$/m);
  assert.match(
    currentReleaseNotes,
    /No local publish, republish, deprecation, dist-tag change, unpublish or retag was performed/,
  );
  assert.match(readme, /The latest published version is `1\.0\.0`/);
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
  assert.match(roadmapArchive, /^### Phase 19 — `v0\.3\.0` controlled release \(complete\)$/m);
  assert.match(changelog, /Version `0\.3\.0` was published on 2026-11-27/);
  // The README is live documentation and must name the current registry release.
  assert.match(readme, /latest published version is `1\.0\.0`/);
  assert.match(readme, /release was published from tag `v1\.0\.0`/);
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
  assert.match(roadmapArchive, /^### Phase 22 — `v0\.4\.0` controlled release \(complete\)$/m);
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
  assert.match(roadmapArchive, /^### Phase 22 — `v0\.4\.0` controlled release \(complete\)$/m);
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

void test('Phase 25 records exact authorization and completed publication evidence', () => {
  const releaseNotes = readFileSync(
    join(repositoryRoot, '.github', 'RELEASE_NOTES_v0.5.0.md'),
    'utf8',
  );
  assert.match(releaseNotes, /^Release notes for `strudel-lsp-server@0\.5\.0`/m);
  assert.match(releaseNotes, /^## Publication record$/m);
  assert.match(releaseNotes, /Published by operator `pedrozappa`/);
  assert.match(releaseNotes, /workflow run `46074959599`/);
  assert.match(releaseNotes, /No local publish, republish, deprecation, dist-tag change/);

  const authorizationMarker = '## ADR-075 — Phase 25 controlled publication authorization';
  const authorizationStart = decisions.indexOf(authorizationMarker);
  assert.notEqual(authorizationStart, -1);
  const authorization = decisions.slice(authorizationStart);
  assert.match(authorization, /Status: accepted/);
  assert.match(authorization, /publish(?:ing)? exactly `strudel-lsp-server@0\.5\.0`/);
  assert.match(authorization, /tag(?:ging)? exactly `v0\.5\.0`/);
  assert.match(authorization, /`pedrozappa` as the named release operator/);
  assert.match(authorization, /does not permit a local publish/);

  const evidenceMarker = '## ADR-076 — Phase 25 `0.5.0` publication evidence';
  const evidenceStart = decisions.indexOf(evidenceMarker);
  assert.notEqual(evidenceStart, -1);
  const evidence = decisions.slice(evidenceStart);
  assert.match(evidence, /Status: accepted/);
  assert.match(evidence, /commit `51f2aa511028a970a92c62e43efdabf141d0b0e9`/);
  assert.match(evidence, /[Vv]alidation job `140760948012`/);
  assert.match(evidence, /publish job `140760945648`/);
  assert.match(evidence, /`npm audit signatures --json --include-attestations`/);
  assert.match(evidence, /`refs\/tags\/v0\.5\.0`/);
  assert.match(evidence, /Phase 25 is complete/);

  assert.match(roadmapArchive, /^### Phase 25 — `v0\.5\.0` controlled release \(complete\)$/m);
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

void test('Phase 26 confirms the package, support and performance policies', () => {
  const marker =
    '## ADR-080 — Phase 26 readiness confirmation: package, support and performance policy';
  const start = decisions.indexOf(marker);
  assert.notEqual(start, -1);
  const section = decisions.slice(start);

  assert.deepEqual(packageJson.files, ['dist/src', 'LICENSE']);
  assert.doesNotMatch(JSON.stringify(packageJson.scripts), /sbom|cyclonedx|spdx/i);
  assert.match(
    packageVerifier,
    /const allowedPrefixes = \['LICENSE', 'README\.md', 'package\.json', 'dist\/src\/'\]/,
  );
  assert.match(
    verifier,
    /JSON\.stringify\(packageJson\.files\) !== JSON\.stringify\(\['dist\/src', 'LICENSE'\]\)/,
  );

  assert.match(section, /retain `package\.json` `files` exactly as `\['dist\/src', 'LICENSE'\]`/);
  assert.match(section, /do not generate an SBOM or add a CycloneDX or SPDX dependency/);
  assert.match(
    section,
    /npm signatures and OIDC-generated SLSA provenance remain the release evidence/,
  );
  assert.match(
    section,
    /`README\.md` `Reporting problems` section remains the user-facing support contract/,
  );
  assert.match(section, /performance thresholds remain advisory/);
  assert.match(section, /no hardware-normalisation multiplier is invented/);
  assert.match(section, /no performance target is a blocking correctness gate/);
  assert.match(section, /exact tagged `v1\.0\.0` candidate must repeat the benchmark checks/);

  assert.match(readme, /^## Reporting problems$/m);
  assert.match(
    performanceDoc,
    /Phase 26 readiness confirmation under ADR-080 kept the policy unchanged/,
  );
  assert.match(performanceDoc, /performance thresholds remain advisory/);
  assert.match(performanceDoc, /No hardware-normalisation multiplier is invented/);
  assert.match(performanceDoc, /No performance target is a blocking correctness gate/);
  assert.match(
    workflow,
    /name: Run advisory benchmark regression check\n\s+continue-on-error: true\n\s+run: npm run benchmark:check/,
  );
  assert.match(
    workflow,
    /name: Run advisory installed-binary JSON-RPC benchmark\n\s+continue-on-error: true\n\s+run: npm run benchmark:e2e/,
  );
  assert.match(
    roadmapArchive,
    /^- \[x\] Confirm the package allowlist, SBOM decision, support guidance and performance policy are implemented and documented\. ADR-080 records/m,
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
    roadmapArchive,
    /^### Phase 17 — Documentation, packaging and support readiness \(complete, `v0\.3\.0`\)$/m,
  );
  const start = roadmapArchive.indexOf(
    '### Phase 17 — Documentation, packaging and support readiness',
  );
  assert.notEqual(start, -1);
  const phase = roadmapArchive.slice(start, roadmapArchive.indexOf('### Phase 18 —', start));
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
