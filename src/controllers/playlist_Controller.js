const mongoose = require("mongoose");
const Playlist = require("../models/playlist");


const create_Playlist = async (req,res) => {
    // get name and descr from req.body 
    // will have access to req.user (creater)
    // create a playlist doc with empty videos array or jsut dont mention it in the create method.
    try 
    {
     const { name, description } = req.body;
     const playlist = await Playlist.create({
         name,
         description,
         createdBy: req.user._id
     })
     if(!playlist) return res.status(500).json({ message:"something bad happened while creating the playlist." })
     return res.status(201).json({ playlist, message:"playlist created successfully." })
    } 
    catch (err) 
    {
        return res.status(500).json({ message:"something went wrong while creating the playlist", err});  
    }
}

const get_User_Playlists = async (req,res) => {
    // get userId from req.params 
    // will have access to req.user 
    // find the playlist docs with this userId as the createdBy 
    //populate the videos field and then subfield owner
    try 
    {
        const { userId } = req.params;
        if(!isValidObjectId(userId)) return res.status(400).json({message:"invalid user id"})

        const playlists = await Playlist.aggregate([         // can also use .find({})
            {
                $match:
                {
                    createdBy: new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $lookup:
                {
                    from:"videos",
                    localField:"videos",
                    foreignField:"_id",
                    as:"videos",
                    pipeline:
                    [
                        {
                            $lookup:
                            {
                                from:"users",
                                localField:"owner",
                                foreignField:"_id",
                                as:"owner",
                                pipeline:
                                [
                                    {
                                        $project:
                                        {
                                            username:1,
                                            fullname:1,
                                            avatar:1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields:
                            {
                                owner:
                                {
                                    $first:"$owner"
                                }
                            }
                        },
                        {
                            $project:
                            {
                                thumbnail:1,
                                owner:1
                            }
                        }
                    ]
                }
            },
            {
                $addFields:
                {
                    totalVideos:
                    {
                        $size:"$videos"
                    }
                }
            }
        ])
        if(playlists.length === 0) return res.status(500).json({ message:"NO playlists created yet." })
        return res.status(200).json({ playlists, message:"playlists fetched successfully." })
    } 
    catch (err) 
    {
        return res.status(500).json({ message:"something went wrong while fetching the playlist", err});     
    }
}

const get_Playlist_By_Id = async (req,res) => {
    // get playlistId from req.params 
    // will have access to req.user
    // find the playlist doc 
    // populate the videos field and then subfield owner
    try 
    {
        const { playlistId } = req.params;
        if(!isValidObjectId(playlistId)) return res.status(400).json({message:"invalid playlist id"})
        const playlist = await Playlist.aggregate([
            {
                $match:
                {
                    _id: new mongoose.Types.ObjectId(playlistId)
                }
            },
            {
                $lookup:
                {
                    from:"videos",
                    localField:"videos",
                    foreignField:"_id",
                    as:"videos",
                    pipeline:
                    [
                        {
                            $lookup:
                            {
                                from:"users",
                                localField:"owner",
                                foreignField:"_id",
                                as:"owner",
                                pipeline:
                                [
                                    {
                                        $project:
                                        {
                                            username:1,
                                            fullname:1,
                                            avatar:1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields:
                            {
                                owner:
                                {
                                    $first:"$owner"
                                }
                            }
                        }
                    ]
                }
            },
            {
                $addFields:
                {
                    totalVideos: { $size:"$videos" }
                }
            }
        ])
        if(!playlist) return res.status(400).json({ message:"playlist not found." })
        return res.status(201).json({ playlist, message:"playlist fecthed successfully." })
    } 
    catch (err) 
    {
        return res.status(500).json({ message:"something went wrong while fetching the playlist by id", err}); 
    }
}

const add_Video_To_Playlist = async (req,res) => {
    //get playlistId to which we want to add the video and the videoId from req.params
    //have access to req.user
    //find the playlist doc with this playlistId
    //just push the videoId into the video field of the doc
    //in case of user create a new playlist using the input field instead of choosing an already made playlist then first request for createplaylist then call this method (for frontend)
    try 
    {
        const {playlistId, videoId} = req.params;
        if(!isValidObjectId(videoId)) return res.status(400).json({message:"invalid video id"})
        if(!isValidObjectId(playlistId)) return res.status(400).json({message:"invalid playlist id"})
        const playlist = await Playlist.findByIdAndUpdate(
            playlistId,
            {
                $push:
                {
                    videos: new mongoose.Types.ObjectId(videoId)
                }
            },
            { new: true }
        );
        if(!playlist) return res.status(400).json({message:"playlist not found."});
        return res.status(200).json({playlist,message:"video added to playlist successfully."});
    } 
    catch (err) 
    {
        return res.status(500).json({ message:"something went wrong while adding the video to the playlist", err});    
    }
}

const remove_Video_From_Playlist = async (req,res) => {
    //get playlistId from which we want to remove the video and the videoId from req.params
    //have access to req.user
    //find the playlist doc with this playlistId
    //just remove the videoId from the video field of the doc
    try 
    {
        const {playlistId, videoId} = req.params;
        if(!isValidObjectId(videoId)) return res.status(400).json({message:"invalid video id"})
        if(!isValidObjectId(playlistId)) return res.status(400).json({message:"invalid playlist id"})
        const playlist = await Playlist.findByIdAndUpdate(
            playlistId,
            {
                $pull:
                {
                    videos: new mongoose.Types.ObjectId(videoId)
                }
            },
            { new: true }
        );
        if(!playlist) return res.status(400).json({message:"playlist not found."});
        return res.status(200).json({ playlist, message:"video removed from playlist successfully." });
    } 
    catch (err) 
    {
        return res.status(500).json({ message:"something went wrong while removing the video from the playlist", err}); 
    }
}

const update_Playlist = async (req,res) => {
    // get playlistId from req.params
    // get name and descr from req.body to update
    // find the playlist doc with this playlistId and update
    try 
    {
        const {playlistId} = req.params;
        if(!isValidObjectId(playlistId)) return res.status(400).json({message:"invalid playlist id"})
        const {name,description} = req.body;
        const playlist = await Playlist.findByIdAndUpdate(
            playlistId,
            {
               $set:
               {
                    name,
                    description
               }
            },
            { new: true }
        );
        if(!playlist) return res.status(400).json({message:"playlist not found."});
        return res.status(200).json({ playlist, message:"playlist updated successfully." });
    } 
    catch (err) 
    {
        return res.status(500).json({ message:"something went wrong while updating the playlist", err}); 
    }

}

const delete_Playlist = async (req,res) => {
    //get playlistId from req.params
    //find the playlist doc with this playlistId and delete
    try 
    {
        const {playlistId} = req.params;
        if(!isValidObjectId(playlistId)) return res.status(400).json({message:"invalid playlist id"})
        const playlist = await Playlist.findByIdAndDelete(playlistId);
        if(!playlist) return res.status(400).json({message:"playlist not found."});
        return res.status(200).json({ playlist, message:"playlist deleted successfully." });
    } 
    catch (err) 
    {
        return res.status(500).json({ message:"something went wrong while deleting the playlist", err}); 
    }
}


module.exports = {
    create_Playlist,
    get_Playlist_By_Id,
    get_User_Playlists,
    add_Video_To_Playlist,
    remove_Video_From_Playlist,
    delete_Playlist,
    update_Playlist
}