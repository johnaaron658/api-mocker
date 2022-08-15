const modulePath = (...modulePaths) => {
    return modulePaths.join('/');
}

exports.modulePath = modulePath;