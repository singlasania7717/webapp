const {
    add_Comment,
    update_Comment,
    delete_Comment,
    get_Video_Comments
} = require("../controllers/comment_Controller");

const verifyJWT = require("../middleware/authorize");
const express = require("express");
const commentRouter = express.Router();

commentRouter.use(verifyJWT);         // all are protected routes

commentRouter.route("/:videoId")
.get(get_Video_Comments)
.post(add_Comment)

commentRouter.route("/:commentId")
.patch(update_Comment)
.delete(delete_Comment)


module.exports = commentRouter;
