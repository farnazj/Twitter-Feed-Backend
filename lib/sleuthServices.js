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

module.exports = {
    getDatasets,
    addDataset,
    registerWorkspace,
    getWorkspaceInfo,
    createCategory,
    getDocumentId,
    getDocumentElements
}