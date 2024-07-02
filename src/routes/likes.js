const {
    toggle_Video_Like,
    toggle_Comment_Like,
    toggle_Tweet_Like,
    get_Liked_Videos,
    get_Disliked_Videos
} = require("../controllers/like_Controller");
const express = require("express");
const verifyJWT = require("../middleware/authorize");
const likeRouter = express.Router();

likeRouter.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

likeRouter.route("/likedvideos").get(get_Liked_Videos);

likeRouter.route("/dislikedvideos").get(get_Disliked_Videos);

likeRouter.route("/togglevideolike/:videoId").post(toggle_Video_Like); // no need to write the toggleStatus query parameter, directly write in the request 

likeRouter.route("/togglecommentlike/:commentId").post(toggle_Comment_Like);

likeRouter.route("/toggletweetlike/:tweetId").post(toggle_Tweet_Like);



module.exports = likeRouter;