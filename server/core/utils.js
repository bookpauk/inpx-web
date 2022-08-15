function versionText(config) {
    return `${config.name} v${config.version}, Node.js ${process.version}`;
}

module.exports = {
    versionText,
};