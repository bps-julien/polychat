module.exports = {
    staticFileGlobs: [
        '/index.html',
        '/manifest.json',
        '/bower_components/webcomponentsjs/*',
        '/src/**/*'
    ],
    navigateFallback: 'index.html',
    navigateFallbackWhitelist: [/^(?!.*\.html$|\/data\/.*)/]
}