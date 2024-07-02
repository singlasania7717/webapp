const {
    get_User_Tweets,
    create_Tweet,
    update_Tweet,
    delete_Tweet,
} = require("../controllers/tweet_Controller");

const express = require("express");
const verifyJWT = require("../middleware/authorize");
const tweetRouter = express.Router();

tweetRouter.use(verifyJWT);    // all are protected routes

tweetRouter.route("/:userId")
.get(get_User_Tweets)

tweetRouter.route("/")
.post(create_Tweet)

tweetRouter.route("/:tweetId")
.patch(update_Tweet)
.delete(delete_Tweet)


module.exports = tweetRouter;