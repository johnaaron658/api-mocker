const project = (refObj, targetObj) => {
    const projection = {};
    for (const key in refObj) {
        if (key in targetObj && targetObj[key]) {
            if (typeof refObj[key] === 'object') {
                projection[key] = project(refObj[key], targetObj[key]);
            } else {
                projection[key] = targetObj[key];
            }
        }
    }
    return projection;
}

const countMatchingKeys = (refObj, targetObj) => {
    let matches = 0;
    for (const key in refObj) {
        if (typeof refObj[key] === 'object' && key in targetObj) {
            matches++;
            matches += countMatchingKeys(refObj[key], targetObj[key]);
        } else if (key in targetObj) {
            matches++;
        }
    }
    return matches;
}

const countMatchingValues = (refObj, targetObj) => {
    let matches = 0;
    for (const key in refObj) {
        if (typeof refObj[key] === 'object') {
            matches += countMatchingValues(refObj[key], targetObj[key]);
        } else if (refObj[key] === targetObj[key]) {
            matches++;
        }
    }
    return matches;
}

const countSimilarities = (refObj, targetObj) => {
    return countMatchingKeys(refObj, targetObj) + countMatchingValues(refObj, targetObj);
}

exports.countMatchingKeys = countMatchingKeys;
exports.countMatchingValues = countMatchingValues;
exports.project = project;
exports.countSimilarities = countSimilarities;