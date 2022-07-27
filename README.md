# Twitter-Feed
Twitter-Feed-Backend
=

Twitter-Feed-Backend is a Node.js server that enables assessing tweets for accuracy. This server connects to [Label Sleuth](https://github.com/farnazj/label-sleuth) to build a personalized AI model for each user. The model is used to predict the user's assessment of other tweets. Twitter-Feed-Backend uses [Twitter-Feed-Frontend](https://github.com/farnazj/Twitter-Feed-Frontend) as its client.


### Setup Instructions

#### Clone This Repository
* `git clone `

#### Install Node Module Dependencies
cd to the root directory of the project where package.json is. Run:
* `npm install`

#### Sequelize Configurations
Twitter-Feed-Backend uses Sequelize as an ORM to connect to a database. The database configurations for Sequelize should be in `./config/database.json`. Copy the contents of `./config/example_database.json` and change the fileds username, password, database, host, and port for whichever environment you are running Twitter-Feed-Backend in (the default environment is development).


#### Database Configurations
For a local development database, install MySQL Server. Connect to the MySQL server using MysSQL client and create a database for the Twitter-Feed-Backend to connect to. Create a user and grant them privileges on the database.

* `mysql -u root -p` (type the root password when prompted)
* `CREATE DATABASE db_name;`
* `CREATE USER user_name IDENTIFIED by 'password';`
* `GRANT ALL PRIVILIGES ON db_name.* TO user;`
* `FlUSH PRIVILEGES;`
* `ALTER USER user IDENTIFIED WITH MYSQL_NATIVE_PASSWORD BY 'password';`

#### Setup Environment Variables
The server uses dotenv to load environment variables from a .env file into process.

* Create a .env fiel in the root directory of the project (no name before the extension)
* Place the following variables in the file and assign values to them:
    + SESSION_KEY=secret (a secret string that you set. It will be used to sign the session ID cookie.)
    + COOKIE_NAME=secret (the name of the session ID cookie that you want to be stored in the browser by the client)
    + NODE_ENV= (one of 'development', 'test', or 'production' without quotes. The default is set to 'development')
    + LOG_LEVEL= (refer to [Winston's](https://www.npmjs.com/package/winston) documentation)
    + REDIS_HOST=127.0.0.1 (the localhost, or the address of a remote redis server)
    + REDIS_PORT=6379 (the default port that Redis runs on, or another port if it is configured to run on a different port)

#### Redis Server
This Node.js server stors sessions in a Redis store. In addition, Redis is used for mainaining a queue of repeatable jobs managed by [Bull](https://github.com/OptimalBits/bull). You should have [Redis](https://redis.io/download) installed and running on your machine before launching the server. Alternatively, you can connect to a remote Redis server and specify the hostname, the port, and optionally the password in the .env file.

#### Add the Data Files
For privacy reasons, the tweet data that the server needs is not committed in the repo. One is a .csv file that needs to be placed in `./data/csv` and the other is a .json file that needs to be placed in `./data/jsons`.
The csv file will be sent as a document to Label Sleuth and the json file is for the Node.js server to read so it can insert its tweets and tweet sources into the database if they do not already exist.
The csv file has 3 columns: doc_id (the tweet ID), text (the text of the tweet), and index. The json file will contain an array of objects. Each object has these fields: tweet_id, text, author_id, username, name, profile_image_url, verified (if the author of the tweet has the blue checkmark given by twitter), pre_task (boolean indicating whether the tweet is part of the feed of tweets presented to the user in the Seeding stage), index. The index of a tweet across the json and the csv files are the same. The index of a tweet will be used by the server to find its corresponding entity in Label Sleuth.

#### Run Twitter-Feed-Backend Server
cd to the root directory fo the project where `package.json` is. Run:
* `npm start`