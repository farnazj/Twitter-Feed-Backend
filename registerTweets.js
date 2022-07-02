var db = require('./models');
var fs = require("fs");
var path = require('path');
var feed = JSON.parse(fs.readFileSync(path.join(__dirname, "data/jsons/farnaz_gathered_dataset.json")));


module.exports = async function() {

    let proms = [];

    let iterationProms = feed.map((el) => {
        return db.Tweet.findOrCreate({
            where: {
                tweetId: el.tweet_id
            },
            defaults: {
                postTime: el.created_at,
                text: el.text,
                retweetCount: el.retweet_count,
                likeCount: el.like_count,
                preTask: el.pre_task,
                index: el.index
            }
        })
        .then(([tweet, created]) => {
            if (created) {
                let allProms = [db.TweetSource.findOrCreate({
                    where: {
                        username: el.username
                    },
                    defaults: {
                        name: el.name,
                        imageUrl: el.profile_image_url,
                        verified: el.verified == 'True'? true : false
                    }
                })];

                if (el.type !== null) {
                    allProms.push(db.Media.create({
                        url: el.url,
                        type: el.type,
                        width: el.width,
                        height: el.height
                    }))
                }

                Promise.all(allProms)
                .then((res) => {

                    // console.log('result is', res)
                    // console.log('tweet is ', tweet)
                    let tweetSource;
                    let proms = [];

                    if (el.type !== null) {
                        // console.log('dakhele in ', res)
                        tweetSource = res[0][0];
                        let media = res[1]
                        proms.push(tweet.addTweetMedia(media));
                    }
                    else
                        tweetSource = res[0][0];

                    proms.push(tweet.setTweetSource(tweetSource));
                    return Promise.all(proms);
                })
            }
            else return new Promise((resolve)=> resolve());
            
        })
    })

    proms.push(...iterationProms);
    
    
    return Promise.all(proms)
   
}


