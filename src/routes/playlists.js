const {
    create_Playlist,
    get_User_Playlists,
    get_Playlist_By_Id,
    add_Video_To_Playlist,
    remove_Video_From_Playlist,
    update_Playlist,
    delete_Playlist
} = require("../controllers/playlist_Controller");

const express = require("express");
const playlistRouter = express.Router();
const verifyJWT = require("../middleware/authorize");

playlistRouter.use(verifyJWT);           // all are protected routes

playlistRouter.route("/")
.post(create_Playlist)

playlistRouter.route("/user/:userId")
.get(get_User_Playlists)

playlistRouter.route("/:playlistId")
.get(get_Playlist_By_Id)
.patch(update_Playlist)
.delete(delete_Playlist)

playlistRouter.route("/add/:playlistId/:videoId")
.get(add_Video_To_Playlist)

playlistRouter.route("/remove/:playlistId/:videoId")
.get(remove_Video_From_Playlist)





module.exports = playlistRouter;