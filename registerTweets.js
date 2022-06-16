var db = require('./models');
var fs = require("fs");
var path = require('path');
var preTaskTweets = JSON.parse(fs.readFileSync(path.join(__dirname, "jsons/preTaskFeed.json")));
var taskTweets = JSON.parse(fs.readFileSync(path.join(__dirname, "jsons/taskFeed.json")));


module.exports = async function() {

    let feedArr = [preTaskTweets, taskTweets];
    let proms = [];

    for (let index = 0 ; index < feedArr.length; index++ ) {
        let feed = feedArr[index];
        let iterationProms = feed.map((el) => {
            return db.Tweet.findOrCreate({
                where: {
                  tweetId: el.tweet_id
                },
                defaults: {
                    postTime: el.created_at,
                    text: el.text,
                    preTask: !index,
                    retweetCount: el.retweet_count,
                    likeCount: el.like_count
                }
            })
            .then(([tweet, created]) => {
                if (created) {
                    return db.TweetSource.findOrCreate({
                        where: {
                            username: el.username
                        },
                        defaults: {
                            name: el.name,
                            imageUrl: el.profile_image_url
                        }
                    })
                    .then(([tweetSource, _]) => {
                        return tweet.setTweetSource(tweetSource);
                    })
                }
                else return new Promise((resolve)=> resolve());
                
            })
        })

        proms.push(...iterationProms);
    }
    
    return Promise.all(proms)
   
}


