const fs = require('fs');
const path = require('path');
const Project = require('fixturify-project');
const BinScript = require('../bin/rwjblue-release-it-setup');
const execa = require('execa');

const BIN_PATH = require.resolve('../bin/rwjblue-release-it-setup');
const ROOT = process.cwd();

function exec(args) {
  return execa(process.execPath, ['--unhandled-rejections=strict', BIN_PATH, ...args]);
}

QUnit.module('main binary', function(hooks) {
  let project;

  function mergePackageJSON(original, updates) {
    return Object.assign({}, original, updates, {
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

    await exec(['--no-install', '--no-label-updates']);

    assert.ok(fs.existsSync('CHANGELOG.md'), 'CHANGELOG.md is present');
  });

  QUnit.skip('removes prefix from existing CHANGELOG.md', async function(assert) {
    project.files['CHANGELOG.md'] = `# master\n\n# v1.2.0\n* Foo bar`;

    await exec(['--no-install', '--no-label-updates']);

    assert.strictEqual(
      fs.readFileSync('CHANGELOG.md', { encoding: 'utf8' }),
      '# v1.2.0\n* Foo bar',
      'removes empty prefix from CHANGELOG.md'
    );
  });

  QUnit.module('package.json', function() {
    QUnit.test('adds release-it configuration and devDependencies to package.json', async function(
      assert
    ) {
      let premodificationPackageJSON = JSON.parse(project.toJSON('package.json'));

      await exec(['--no-install', '--no-label-updates']);

      let pkg = JSON.parse(fs.readFileSync('package.json', { encoding: 'utf8' }));
      let expected = mergePackageJSON(premodificationPackageJSON, {
        devDependencies: {
          'release-it': require('../package').devDependencies['release-it'],
          'release-it-lerna-changelog': require('../package').devDependencies[
            'release-it-lerna-changelog'
          ],
        },
        publishConfig: {
          registry: 'https://registry.npmjs.org',
        },
        'release-it': {
          plugins: {
            'release-it-lerna-changelog': {
              infile: 'CHANGELOG.md',
              launchEditor: true,
            },
          },
          git: {
            tagName: 'v${version}',
          },
          github: {
            release: true,
            tokenRef: 'GITHUB_AUTH',
          },
        },
      });

      assert.deepEqual(pkg, expected);
    });

    QUnit.test('does not remove existing release-it configuration', async function(assert) {
      project.pkg['release-it'] = {
        hooks: {
          'after:bump': 'npm run something',
        },
        plugins: {
          'release-it-lerna-changelog': {
            launchEditor: false,
          },
        },
        git: {
          'some-other': 'prop',
        },
      };
      project.writeSync();

      let premodificationPackageJSON = JSON.parse(project.toJSON('package.json'));

      assert.deepEqual(
        premodificationPackageJSON['release-it'],
        {
          hooks: {
            'after:bump': 'npm run something',
          },
          plugins: {
            'release-it-lerna-changelog': {
              launchEditor: false,
            },
          },
          git: {
            'some-other': 'prop',
          },
        },
        'precond - release-it contents exist initially'
      );

      await exec(['--no-install', '--no-label-updates']);

      let pkg = JSON.parse(fs.readFileSync('package.json', { encoding: 'utf8' }));
      let expected = mergePackageJSON(premodificationPackageJSON, {
        devDependencies: {
          'release-it': require('../package').devDependencies['release-it'],
          'release-it-lerna-changelog': require('../package').devDependencies[
            'release-it-lerna-changelog'
          ],
        },
        publishConfig: {
          registry: 'https://registry.npmjs.org',
        },
        'release-it': {
          hooks: {
            'after:bump': 'npm run something',
          },
          plugins: {
            'release-it-lerna-changelog': {
              infile: 'CHANGELOG.md',
              launchEditor: false,
            },
          },
          git: {
            tagName: 'v${version}',
            'some-other': 'prop',
          },
          github: {
            release: true,
            tokenRef: 'GITHUB_AUTH',
          },
        },
      });

      assert.deepEqual(pkg, expected);
    });

    QUnit.test('does not update devDependencies if release-it range is greater', async function(
      assert
    ) {
      project.addDevDependency('release-it', '^13.2.0');
      project.writeSync();

      let premodificationPackageJSON = JSON.parse(project.toJSON('package.json'));

      await exec(['--no-install', '--no-label-updates']);

      let pkg = JSON.parse(fs.readFileSync('package.json', { encoding: 'utf8' }));
      let expected = mergePackageJSON(premodificationPackageJSON, {
        devDependencies: {
          'release-it': '^13.2.0',
          'release-it-lerna-changelog': require('../package').devDependencies[
            'release-it-lerna-changelog'
          ],
        },
        publishConfig: {
          registry: 'https://registry.npmjs.org',
        },
        'release-it': {
          plugins: {
            'release-it-lerna-changelog': {
              infile: 'CHANGELOG.md',
              launchEditor: true,
            },
          },
          git: {
            tagName: 'v${version}',
          },
          github: {
            release: true,
            tokenRef: 'GITHUB_AUTH',
          },
        },
      });

      assert.deepEqual(pkg, expected);
    });

    QUnit.test(
      'does not update devDependencies if release-it-lerna-changelog range is greater',
      async function(assert) {
        project.addDevDependency('release-it-lerna-changelog', '^3.0.0');
        project.writeSync();

        let premodificationPackageJSON = JSON.parse(project.toJSON('package.json'));

        await exec(['--no-install', '--no-label-updates']);

        let pkg = JSON.parse(fs.readFileSync('package.json', { encoding: 'utf8' }));
        let expected = mergePackageJSON(premodificationPackageJSON, {
          devDependencies: {
            'release-it': require('../package').devDependencies['release-it'],
            'release-it-lerna-changelog': '^3.0.0',
          },
          publishConfig: {
            registry: 'https://registry.npmjs.org',
          },
          'release-it': {
            plugins: {
              'release-it-lerna-changelog': {
                infile: 'CHANGELOG.md',
                launchEditor: true,
              },
            },
            git: {
              tagName: 'v${version}',
            },
            github: {
              release: true,
              tokenRef: 'GITHUB_AUTH',
            },
          },
        });

        assert.deepEqual(pkg, expected);
      }
    );

    QUnit.test('installs dependencies', async function(assert) {
      await exec(['--no-label-updates']);

      assert.ok(fs.existsSync('node_modules/release-it'), 'release-it installed');
      assert.ok(
        fs.existsSync('node_modules/release-it-lerna-changelog'),
        'release-it-lerna-changelog installed'
      );
    });
  });

  QUnit.module('RELEASE.md', function() {
    function expectedReleaseContents(isYarn) {
      let releaseContents = fs.readFileSync(path.join(__dirname, '..', 'release-template.md'), {
        encoding: 'utf8',
      });

      let dependencyInstallReplacementValue = isYarn ? 'yarn install' : 'npm install';

      return releaseContents.replace('{{INSTALL_DEPENDENCIES}}', dependencyInstallReplacementValue);
    }

    QUnit.test('adds RELEASE.md to repo when no yarn.lock exists', async function(assert) {
      assert.notOk(fs.existsSync('RELEASE.md'), 'precond - RELEASE.md is not present');

      await exec(['--no-install', '--no-label-updates']);

      assert.strictEqual(
        fs.readFileSync('RELEASE.md', { encoding: 'utf8' }),
        expectedReleaseContents(false),
        'RELEASE.md was created with the correct contents'
      );
    });

    QUnit.test('adds RELEASE.md to repo when yarn.lock exists', async function(assert) {
      fs.writeFileSync('yarn.lock', '', { encoding: 'utf-8' });

      assert.notOk(fs.existsSync('RELEASE.md'), 'precond - RELEASE.md is not present');

      await exec(['--no-install', '--no-label-updates']);

      assert.strictEqual(
        fs.readFileSync('RELEASE.md', { encoding: 'utf8' }),
        expectedReleaseContents(true),
        'RELEASE.md was created with the correct contents'
      );
    });

    QUnit.module('--update', function(hooks) {
      hooks.beforeEach(async function() {
        await exec(['--no-install', '--no-label-updates']);
      });

      QUnit.test('updates RELEASE.md when yarn.lock exists', async function(assert) {
        fs.writeFileSync('yarn.lock', '', { encoding: 'utf-8' });
        fs.writeFileSync('RELEASE.md', 'lololol', 'utf8');

        await exec(['--no-install', '--no-label-updates', '--update']);

        assert.strictEqual(
          fs.readFileSync('RELEASE.md', { encoding: 'utf8' }),
          expectedReleaseContents(true),
          'RELEASE.md has the correct contents'
        );
      });

      QUnit.test('updates RELEASE.md when no yarn.lock exists', async function(assert) {
        fs.writeFileSync('RELEASE.md', 'lololol', 'utf8');

        await exec(['--no-install', '--no-label-updates', '--update']);

        assert.strictEqual(
          fs.readFileSync('RELEASE.md', { encoding: 'utf8' }),
          expectedReleaseContents(false),
          'RELEASE.md has the correct contents'
        );
      });
    });
  });
});

QUnit.module('unit', function() {
  QUnit.module('findRepoURL', function() {
    [
      ['https://github.com/rwjblue/foo', 'rwjblue/foo'],
      ['https://github.com/rwjblue/foo.git', 'rwjblue/foo'],
      ['https://github.com/rwjblue/foo.js.git', 'rwjblue/foo.js'],
      ['git@github.com:rwjblue/foo.git', 'rwjblue/foo'],
      ['git@github.com:rwjblue/foo.js.git', 'rwjblue/foo.js'],
    ].forEach(([source, expected]) => {
      QUnit.test(`${source} -> ${expected}`, function(assert) {
        assert.strictEqual(BinScript.findRepoURL({ repository: source }), expected);
        assert.strictEqual(BinScript.findRepoURL({ repository: { url: source } }), expected);
      });
    });
  });

  QUnit.module('getDependencyRange', function() {
    [
      { theirs: '1.0.0', ours: '^2.0.0', expected: '^2.0.0' },
      { theirs: '^3.0.0', ours: '^2.0.0', expected: '^3.0.0' },
      { theirs: 'github:foo/bar', ours: '^2.0.0', expected: 'github:foo/bar' },
      { theirs: 'foo/bar', ours: '^2.0.0', expected: 'foo/bar' },
    ].forEach(({ theirs, ours, expected }) => {
      QUnit.test(`${theirs},${ours} -> ${expected}`, function(assert) {
        assert.strictEqual(BinScript.getDependencyRange(theirs, ours), expected);
      });
    });
  });
});
