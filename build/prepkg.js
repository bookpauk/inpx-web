const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

const showdown = require('showdown');

const platform = process.argv[2];

const distDir = path.resolve(__dirname, '../dist');
const tmpDir = `${distDir}/tmp`;
const publicDir = `${tmpDir}/public`;
const outDir = `${distDir}/${platform}`;

async function build() {
    if (platform != 'linux' && platform != 'win' && platform != 'macos')
        throw new Error(`Unknown platform: ${platform}`);

    await fs.emptyDir(outDir);

    //добавляем readme в релиз
    let readme = await fs.readFile(path.resolve(__dirname, '../README.md'), 'utf-8');
    const converter = new showdown.Converter();
    readme = converter.makeHtml(readme);
    await fs.writeFile(`${outDir}/readme.html`, readme);

    // перемещаем public на место
    if (await fs.pathExists(publicDir)) {

        const zipFile = `${tmpDir}/public.zip`;
        const jsonFile = `${distDir}/public.json`;//distDir !!!

        await fs.remove(zipFile);
        execSync(`zip -r ${zipFile} .`, {cwd: publicDir, stdio: 'inherit'});

        const data = (await fs.readFile(zipFile)).toString('base64');
        await fs.writeFile(jsonFile, JSON.stringify({data}));
    } else {
        throw new Error(`publicDir: ${publicDir} does not exist`);
    }
}

async function main() {
    try {
        await build();
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}

main();
