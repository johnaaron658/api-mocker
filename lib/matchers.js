const { countSimilarities, project } = require('./utils/object-utils.js');

const getRequestScore = (mock, realReq) => {
    if (!mock.request) {
        return 0;
    }
    const projection = project(mock.request, realReq);
    return countSimilarities(mock.request, projection);
}

const getUriParamScore = (mock, realReq) => {
    if (!mock.params) {
        return 0;
    }
    const projection = project(mock.params, realReq.params);
    return countSimilarities(mock.params, projection);
}

exports.criteria = [
    getRequestScore,
    getUriParamScore,
];