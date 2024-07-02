const {
    toggle_Subscribe,
    get_Channel_Subscribers,
    get_Subscribed_Channels
} = require("../controllers/subscription_Controller");

const verifyJWT = require("../middleware/authorize");
const express = require("express");
const subscriptionRouter = express.Router();

subscriptionRouter.use(verifyJWT);         // all are protected routes

subscriptionRouter.route("/toggle/:channelId")
.get(toggle_Subscribe);

subscriptionRouter.route("/subscribers/:channelId")
.get(get_Channel_Subscribers);

subscriptionRouter.route("/subscribedTo/:userId")
.get(get_Subscribed_Channels);


module.exports = subscriptionRouter;