const mongoose = require("mongoose");

const playlistSchema = new mongoose.Schema({
    createdBy:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    videos:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"Video"
        }
    ],
    discription:{
        type:string,
        required:true
    },
    name:{
        type:string,
        required:true
    }


},{ timestamps:true })

const Playlist = mongoose.model("Playlist",playlistSchema);
module.exports = Playlist;