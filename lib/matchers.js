import { countSimilarities, project } from './utils/object-utils.js';

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

const criteria = [
    getRequestScore,
    getUriParamScore,
];

export { criteria };