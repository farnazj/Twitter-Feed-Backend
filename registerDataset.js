
var fs = require("fs");
var sleuthServices = require('./lib/sleuthServices');
var path = require('path');
var FormData = require('form-data');
var feed = fs.createReadStream(path.join(__dirname, "data/csv/sleuth_sampled_data.csv"));
var constants = require('./lib/constants');

module.exports = async function() {
    try {

        // /to be commented out for production
        let allWorkspaces = (await sleuthServices.getWorkspaces()).data.workspaces;
        console.log('all workspaces', allWorkspaces)
        let workspaceProms = allWorkspaces.map(el => sleuthServices.deleteWorkspace(el));
        await Promise.all(workspaceProms);
        

        let resp = await sleuthServices.getDatasets();
        datasets = resp.data.datasets;
    
        let twitterFeedDataset = datasets.filter(el => el.dataset_id == constants.SLEUTH_DOC_NAME);
        if (!twitterFeedDataset.length) {

            let formData = new FormData()
            formData.append('file', feed);
            formData.append('dataset_name', constants.SLEUTH_DOC_NAME)

            await sleuthServices.addDataset({
                name: constants.SLEUTH_DOC_NAME, 
                data: formData
            })
    
        }
    }
    catch(err) {
        console.error(err);
    }
    
}