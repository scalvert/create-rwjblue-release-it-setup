const fs = require('fs');
const path = require('path');
const Project = require('fixturify-project');
const execa = require('execa');

const BIN_PATH = require.resolve('../bin/rwjblue-release-it-setup');
const ROOT = process.cwd();

QUnit.module('main binary', function(hooks) {
  let project;

  function mergePackageJSON(original, updates) {
    return Object.assign({}, original, updates, {
      scripts: Object.assign({}, original.scripts, updates.scripts),
      publishConfig: Object.assign({}, original.publishConfig, updates.publishConfig),
      dependencies: Object.assign({}, original.dependencies, updates.dependencies),
      devDependencies: Object.assign({}, original.devDependencies, updates.devDependencies),
    });
  }

  hooks.beforeEach(function() {
    project = new Project('some-thing-cool', '0.1.0');
    project.writeSync();
    process.chdir(path.join(project.root, project.name));
  });

  hooks.afterEach(function() {
    process.chdir(ROOT);
  });

  QUnit.test('adds CHANGELOG.md file', async function(assert) {
    assert.notOk(fs.existsSync('CHANGELOG.md'), 'precond - CHANGELOG.md is not present');

    await execa(BIN_PATH, ['--no-install']);

    assert.ok(fs.existsSync('CHANGELOG.md'), 'CHANGELOG.md is present');
  });

  QUnit.skip('removes prefix from existing CHANGELOG.md', async function(assert) {
    project.files['CHANGELOG.md'] = `# master\n\n# v1.2.0\n* Foo bar`;

    await execa(BIN_PATH, ['--no-install']);

    assert.strictEqual(
      fs.readFileSync('CHANGELOG.md', { encoding: 'utf8' }),
      '# v1.2.0\n* Foo bar',
      'removes empty prefix from CHANGELOG.md'
    );
  });

  QUnit.test('updates the package.json', async function(assert) {
    let premodificationPackageJSON = JSON.parse(project.toJSON('package.json'));

    await execa(BIN_PATH, ['--no-install']);

    let pkg = JSON.parse(fs.readFileSync('package.json', { encoding: 'utf8' }));
    let expected = mergePackageJSON(premodificationPackageJSON, {
      devDependencies: {
        'release-it': '^12.2.1',
        'release-it-lerna-changelog': '^1.0.3',
      },
      scripts: {
        release: 'release-it',
      },
      publishConfig: {
        registry: 'https://registry.npmjs.org',
      },
      'release-it': {
        plugins: {
          'release-it-lerna-changelog': {
            infile: 'CHANGELOG.md',
          },
        },
        git: {
          tagName: 'v${version}',
        },
        github: {
          release: true,
        },
      },
    });

    assert.deepEqual(pkg, expected);
  });

  QUnit.test('installs dependencies', async function(assert) {
    await execa(BIN_PATH);

    assert.ok(fs.existsSync('node_modules/release-it'), 'release-it installed');
    assert.ok(
      fs.existsSync('node_modules/release-it-lerna-changelog'),
      'release-it-lerna-changelog installed'
    );
  });

  QUnit.todo('adds release-it config to package.json', function() {});
});