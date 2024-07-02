const Video = require("../models/video");
const Subscription = require("../models/subscription");
const mongoose = require("mongoose");


const get_Channel_Stats = async (req,res) => {
    //have access to req.user
    //get total videos, subscribers & views(unique)
    try 
    {
        const videos = await Video.aggregate([
            {
                $match:
                {
                    owner: new mongoose.Types.ObjectId(req.user._id)
                }
            },
            {
                $unwind:"$views"
            },
            {
                $group:
                {
                    _id:null,
                    views:{ $addToSet:"$views"}
                }
            }
        ])
    
        const subscribers = await Subscription.aggregate([
            {
                $match:
                {
                    channel: new mongoose.Types.ObjectId(req.user._id)
                }
            }
        ])

        const response = {
            channelName:req.user.fullname,
            totalViews: videos[0].views.length,
            totalVideos:videos.length,
            Subscribers: subscribers.length,  
        }
        return res.status(200).json(response);
    } 
    catch (err) 
    {
        return res.status(500).json({message:"something bad happened while fetching the channel stats.",err})    
    }
}


const get_Channel_Videos = async (req,res) => {
    //have access to req.user
    //get total videos & views/likes/dislikes/comments on each video
     
    //getting my videos and counting the likes/dislikes on each (views toh already doc mein hain hii)
    const videos = await Video.aggregate([
        {
            $match:
            {
                owner: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {     //getting likes
            $lookup:
            {
                from:"likes",
                localField:"_id",
                foreignField:"video",
                as:"likes",
                pipeline:
                [
                    {
                        $match:
                        {
                            liked:"true"
                        }
                    }
                ]
            }
        },
        {     //getting dislikes
            $lookup:
            {
                from:"likes",
                localField:"_id",
                foreignField:"video",
                as:"dislikes",
                pipeline:
                [
                    {
                        $match:
                        {
                            liked:"false"
                        }
                    }
                ]
            }
        },
        {   //getting comments
            $lookup:
            {
                from:"comments",
                localField:"_id",
                foreignField:"video",
                as:"comments"
            }
        },
        {
            $addFields:
            {
                likes:
                {
                    $size:"$likes"
                },
                dislikes:
                {
                    $size:"$dislikes"
                },
                comments:
                {
                    $size:"$comments"
                },
                views:
                {
                    $size:"$views"
                }
            }
        },
        {
            $project:
            {
                views:1,
                likes:1,
                dislikes:1,
                comments:1,
                thumbnail:1,
                createdAt:1,
                updatedAt:1,
                title:1,
                description:1
            }
        }
    ])

    return res.json(videos)
}


module.exports = {
    get_Channel_Stats,
    get_Channel_Videos
}