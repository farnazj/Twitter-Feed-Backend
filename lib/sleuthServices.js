const constants = require('../lib/constants');
const axios = require('axios');

const Api = axios.create({
    baseURL: constants.SLEUTH_API
});

async function getDatasets() {
    return Api.get('/datasets');
}

async function addDataset(dataObj) {
    return Api.post(`/datasets/${dataObj.name}/add_documents`, dataObj.data, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
}

async function registerWorkspace(name) {

    return Api.post(`/workspace`, {
        workspace_id: name,
        dataset_id: constants.SLEUTH_DOC_NAME
    });
}


async function getWorkspaces() {
    return Api.get(`/workspaces`);
}

async function deleteWorkspace(name) {
    return Api.delete(`/workspace/${name}`);
}

async function getWorkspaceInfo(name) {
    return Api.get(`/workspaces/${name}`);
}

async function createCategory(workspaceName) {
    return Api.post(`/workspace/${workspaceName}/category`, {
        category_name: 'inaccurate',
        category_description: 'inaccurate tweets'
    });
}

async function getDocumentId(workspaceName) {
    return Api.get(`/workspace/${workspaceName}/documents`);
}

async function getDocumentElements(dataObj) {
    return Api.get(`/workspace/${dataObj.workspaceName}/document/${dataObj.documentId}`);
}

async function setElementLabel(dataObj) {
    return Api.put(`/workspace/${dataObj.workspaceName}/element/${dataObj.elementId}
    `, {
        category_name: 'inaccurate',
        value: dataObj.value,
        update_counter: true
    })
}

async function getLabelingStatus(workspaceName) {
    return Api.get(`/workspace/${workspaceName}/status?category_name=inaccurate`);
}

async function getModels(workspaceName) {
    return Api.get(`/workspace/${workspaceName}/models?category_name=inaccurate`);
}

async function getPositivePredictions(dataObj) {
    return Api.get(`workspace/${dataObj.workspaceName}/document/${dataObj.documentId}/positive_predictions?category_name=inaccurate&start_idx=0&size=300`)
}

async function getNextToLabel(dataObj) {
    return Api.get(`/workspace/${dataObj.workspaceName}/active_learning?category_name=inaccurate&start_idx=0&size=300`)
}

module.exports = {
    getDatasets,
    addDataset,
    registerWorkspace,
    getWorkspaceInfo,
    createCategory,
    getDocumentId,
    getDocumentElements,
    setElementLabel,
    getWorkspaces,
    deleteWorkspace,
    getLabelingStatus,
    getModels,
    getPositivePredictions,
    getNextToLabel
}