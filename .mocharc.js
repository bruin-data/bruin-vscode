module.exports = {
    require: ['ts-node/register', 'source-map-support/register'],
    timeout: 150000,
    extension: ['ts', 'js'],
    spec: ['out/test/ui/*.test.js']
};