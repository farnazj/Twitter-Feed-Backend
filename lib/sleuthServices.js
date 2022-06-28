const constants = require('../lib/constants');
const axios = require('axios');

const Api = axios.create({
    baseURL: constants.SLEUTH_API
});

async function getDatasets() {
    return Api().get('/datasets');
}

async function postDataset(dataObj) {
    return Api().post(`/datasets/${dataObj.name}/add_documents`, dataObj.data, {
        'Content-Type': 'multipart/form-data'
    });
}


module.exports = {
    getDatasets,
    postDataset
}