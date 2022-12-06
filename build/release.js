const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

const pckg = require('../package.json');

const distDir = path.resolve(__dirname, '../dist');
const outDir = `${distDir}/release`;

async function makeRelease(target) {
    const srcDir = `${distDir}/${target}`;

    if (await fs.pathExists(srcDir)) {
        const zipFile = `${outDir}/${pckg.name}-${pckg.version}-${target}.zip`;

        execSync(`zip -r ${zipFile} .`, {cwd: srcDir, stdio: 'inherit'});
    }
}

async function main() {
    try {
        await fs.emptyDir(outDir);
        await makeRelease('win');
        await makeRelease('linux');
        await makeRelease('linux-arm64');
        await makeRelease('macos');
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}

main();
