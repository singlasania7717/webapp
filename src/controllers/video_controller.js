const mongoose  = require("mongoose");
const User = require("../models/user");
const Video = require("../models/video");
const { upload_On_Cloudinary, delete_From_Cloudinary } = require("../utils/cloudinary");
 

const get_All_Videos = async ( req,res ) => {
    //get the userid from params and find all the videos with that owner id (there is no need to populate the owner field)
    //we have access to req.user
    //


                                             //      PENDING      //



    const { userid } = req.query;
    const videos = await Video.aggregate([
        {
            $match:{
                owner: new mongoose.Types.ObjectId(userid)
            }
        }
    ])
    return res.status(200).json(videos);
}

const publish_a_Video = async ( req,res ) => {
    //since user(the one publishing the video) should be logged in so we have req.user 
    //get the video file,thumbnail through multer and upload on cloudinary and get the url
    //get the description,title from req.body
    //confirm the uploads/urls
    //create entry in the videos collection
    //return the response as the video info and the message

    if(!req.files.videoFile || !req.files.thumbnail ) return res.status(400).json({ message:"video file and thumbnail is required" });
    const { title, description } = req.body;
    if( !title || !description ) return res.status(400).json({ message:"title and description are required." });
    const videoFile_Localpath = req.files.videoFile[0].path;
    const thumbnail_Localpath = req.files.thumbnail[0].path;
    const videoFile = await upload_On_Cloudinary(videoFile_Localpath);
    const thumbnail = await upload_On_Cloudinary(thumbnail_Localpath);
    //console.log(thumbnail,"\n",videoFile);       // it contains the duration property for a video file in seconds
    if(!videoFile || !thumbnail) return res.status(500).json({ message:"file couldn't be uploaded on cloudinary." });

    //create entry
    const video = await Video.create({
        description,
        title,
        duration:videoFile.duration,
        thumbnail: thumbnail.url,
        videoFile: videoFile.url,
        owner: req.user._id,
        //views: //will be default yet 
        //is published:false // will add later
    })

    const publishedVideo = await Video.findById(video._id);
    if(!publishedVideo) return res.status(500).json({message:"couldn't find the published video in db."})

    return res.status(201).json({publishedVideo,message:"video published successfully."});    
} 

const update_a_Video = async ( req,res ) => {
    //get video id from req.params // for finding in db
    //allowing to change the title , description and thumbnail
    //req.user is accessable
    //*****we can only update the video if we are the owner of the video*****
    //get the thumbnail(multer), title & description
    // upload the thumbnail on cloudinary 
    //verify the uploads/urls
    //return the new video model
    const { videoid } = req.params;               // toh url mein bhi /:videoid ==> same likhna hoga
    if(!videoid) return res.status(400).json({ message:"video id is missing." });

    const video = await Video.findById(videoid);
    if (!video) return res.status(400).json({message:"video doesn't exist."})

    const oldThumbnail_url = video.thumbnail;  // because baad mein fir ye update krde hai hmne 

    if(!video.owner.equals(req.user._id)) return res.status(401).json({ message:"you don't have right to update this video." });
    //or video.owner.toString() !== req.user?._id.toString()   ==> .equals() method is provided by mongoose to compare the ids without string conversion

    //so we are the owner at this point
    const { description, title } = req.body;
    if( !description || !title ) return res.status(400).json({ message:"description & title are required." });
    if(!req.file) return res.status(400).json({ message:"thumbnail is required." });

    //so we do have file at this point
    const newThumbnail_Localpath = req.file.path;
    const newThumbnail =await upload_On_Cloudinary(newThumbnail_Localpath);
    if(!newThumbnail) return res.status(500).json({ message:"new thumbnail couldn't be uploaded on cloudinary." });

    //updating
    video.description = description;
    video.title = title;
    video.thumbnail = newThumbnail.url; 
    // const video = await Video.findByIdAndUpdate(
    //     videoid,
    //     {
    //         $set:
    //         {
    //             thumbnail: newThumbnail.url,                     //AVOIDING ANOTHER DATABASE CALL BY ABOVE CODE
    //             description,
    //             title
    //         }
    //     },
    //     { new: true }
    // );
    await video.save({ validateBeforeSave:false })
    //deleting old thumbnail
    const deletedThumbnail = await delete_From_Cloudinary(oldThumbnail_url);
    if( deletedThumbnail.result !== "ok" ) return res.status(500).json({message:"file not deleted from cloudinary." })
    return res.status(200).json({ video,message:"updated the thumbnail, title & description successfully."});

}

const delete_a_Video = async ( req,res ) => {
    //get the video id by params 
    //find it in the db
    //you should be the owner of the video
    //then just delete the video

    const { videoid } = req.params;
    if(!videoid) return res.status(400).json({ message:"video id is missing." });
    const video = await Video.findById(videoid);
    if (!video) return res.status(400).json({message:"video doesn't exist."})
    //checking for the owner
    if(!video.owner.equals(req.user._id)) return res.status(401).json({ message:"you don't have right to delete this video." });

    //deleting the files from cloudinary 
    const deletedThumbnail = await delete_From_Cloudinary(video.thumbnail);
    const deletedVideoFile = await delete_From_Cloudinary(video.videoFile);
    if( deletedVideoFile.result !== "ok" || deletedThumbnail.result!== "ok" ) return res.status(500).json({message:"files not deleted from cloudinary." })
    const deletedVideo = await Video.findByIdAndDelete(video._id);     // videoid
    
    return res.status(200).json({ deletedVideo, message:"video deleted successfully." });
}

const get_Video_By_Id  = async ( req,res ) => {   // will be used while playing the videos on clicking and showing the owner details under the videos 
    //get the id from params and find the video
    //have access to req.user
    //increment the views of the video 
    //push the video id to the user watch history  //sub-pipeline won't work (can't avoid the extra db call) becuase they cant presist the changes
    //populate the owner before returning the video using aggregation pipelines

    const { videoid } = req.params;
    if(!videoid) return res.status(400).json({ message:"video id is missing." });

    const video = await Video.findById(videoid);
    if(!video) return res.status(400).json({ message:"video doesn't exist." })

    //incrementing views****
    await video.increment_Views();
    //pushing the id into the watchHistory****
    const user = await User.findById(req.user._id);
    await user.updateWatchHistory(videoid);

    //aggregation pipeline
    const detailedVideo = await Video.aggregate([
        {
            $match:
            {
                _id: new mongoose.Types.ObjectId(videoid)    // becuase url se toh hmme "71584619797071074jag" is form mein milegi (no autoconversion since mongodb opr not mongoose)
            }
        },
        {
            $lookup:
            {
                from:"users",                // we are in video model
                localField:"owner",
                foreignField:"_id",
                as:"owner",
                pipeline:
                [//pushing the videoid in history array // we are inside owner field so can directly operate with watchHistroy ( just like in watch history first we did lookup to populate the watchhistory ke andr ke video ids then in the sub pipeline(we entered inside the history array can also say in the each video model element becuase all are same) then we used lookup to get the owner field populated) ==> intersting *******
                    // {
                    //     $addFields:
                    //     {   
                    //         watchHistory:
                    //         {
                    //             $cond:
                    //             {
                    //                 if:{ $in: [ videoid,"$watchHistory"] },
                    //                 then:"$watchHistory",                                         
                    //                 else:{ $concatArrays:[ "$watchHistory",[videoid] ] }
                    //             }
                    //         }
                    //     }
                    // },//this approach is working but not retaining in the original doc and reseting everytime so we will have to concat it separately cant avoid it 
                    {
                        $project:
                        {
                            fullname:1,
                            username:1,
                            avatar:1
                        }
                    }
                ]
            }
        },
        {
            $lookup:
            {
                from:"likes",
                localField:"_id",
                foreignField:"video",
                as:"likes"
            } //array
        },
        {
            $addFields:
            {
                owner:
                {
                    $first:"$owner"
                },
                likesCount:
                {
                    $size:"$likes"
                },
                hasLiked:{
                    $cond:{
                        if:{ $in: [req.user._id,"$likes.likeBy"] },
                        then:true,
                        else:false
                    }
                }
            }
        }
    ])


    return res.status(200).json({ detailedVideo:detailedVideo[0],message:"video fetched successfully." });


}




module.exports = {
    get_All_Videos,
    publish_a_Video,
    update_a_Video,
    delete_a_Video,
    get_Video_By_Id
}
