const SLEUTH_API='http://localhost:8000'
const STAGE_1_SIZE=26;
const SLEUTH_DOC_NAME="twitter_feed10";
const GRACE_PERIOD= 25 * 60 * 1000; //time to wait after a ws is killed before deleting the user's models and jobs

module.exports = {
    SLEUTH_API,
    STAGE_1_SIZE,
    SLEUTH_DOC_NAME,
    GRACE_PERIOD
}