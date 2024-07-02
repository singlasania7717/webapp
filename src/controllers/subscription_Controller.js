const mongoose = require("mongoose");
const Subscription = require("../models/subscription");
const {isValidObjectId} = require("mongoose")

//channelId is also someone's userId so dont confuse ki ye channelId kya hai ye channelId 😉 
const toggle_Subscribe = async (req,res) => {
    //have access to req.user
    //get the channel id from req.params
    //check for existing doc => a) if found delete the doc
    //                          b) if not found create a new doc ( here no worries about true/flase => either we have doc or not )
    try 
    {
        const { channelId } = req.params;
        if(!isValidObjectId(channelId)) return res.status(400).json({message:"invalid channel id"})

        if(channelId === (req.user._id).toString()) return res.status(400).json({message:"you cant subscribe your own channel"})
        const existingDoc = await Subscription.findOne({
            subscriber: new mongoose.Types.ObjectId(req.user._id),
            channel: new mongoose.Types.ObjectId(channelId)
        })
        if(!existingDoc)
        {
            //create a new doc
            const createdDoc = await Subscription.create({
                subscriber: req.user._id,
                channel: channelId
            })
            if(!createdDoc) return res.status(500).json({ message: "something wrong happend while creating the doc." })
            
            return res.status(201).json({createdDoc,message:"subscribed the channel successfully."}) 
        }
        else //so we do have a doc
        {
            //delete the doc
            const deletedDoc = await Subscription.findByIdAndDelete(existingDoc._id)
            if(!deletedDoc) return res.status(500).json({ message: "something wrong happend while deleting the doc." })
            
            return res.status(200).json({deletedDoc, message:"removed the subscribe successfully."}) 
        }
    } 
    catch (err) 
    {
        return res.status(500).json({ message:"something went wrong while toggling the subscribe", err});     
    }
}

const get_Channel_Subscribers = async (req,res) => {
    //have access to req.user
    //get the channelId from req.params
    //write the pipeline
    //populate the subscriber field
    try 
    {
        const { channelId } = req.params;
        if(!isValidObjectId(channelId)) return res.status(400).json({message:"invalid channel id"})

        const subscribers = await Subscription.aggregate([
            {
                $match:
                {
                    channel: new mongoose.Types.ObjectId(channelId)
                }
            },
            {
                $lookup:
                {
                    from:"users",
                    localField:"subscriber",
                    foreignField:"_id",
                    as:"subscriber",
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
                    subscriber:
                    {
                        $first:"$subscriber"
                    }
                }
            },
            {
                $project:
                {
                    subscriber:1,
                    _id:0
                }
            }
        ])
        if(subscribers.length === 0) return res.status(200).json({message:"no subscribers found."})
        
        return res.status(200).json({subscribers,message:"subscribers fetched successfully."})
    } 
    catch (err) 
    {
        return res.status(500).json({ message:"something went wrong while fetching the subscribers", err});     
    }
}

const get_Subscribed_Channels = async (req,res) => {
    //have access to req.user
    //get the userId from req.params
    //write the pipeline
    //populate the channel field
    try 
    {
        const { userId } = req.params;
        if(!isValidObjectId(userId)) return res.status(400).json({message:"invalid user id"})

        const subscribedChannels = await Subscription.aggregate([
            {
                $match:
                {
                    subscriber: new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $lookup:
                {
                    from:"users",
                    localField:"channel",
                    foreignField:"_id",
                    as:"channel",
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
                    channel:
                    {
                        $first:"$channel"
                    }
                }
            },
            {
                $project:
                {
                    channel:1,
                    _id:0
                }
            }
        ])
        if(subscribedChannels.length === 0) return res.status(200).json({message:"NO channels subscribed."})
        
        return res.status(200).json({ subscribedChannels, message:"subscribed channels fetched successfully." })
    } 
    catch (err) 
    {
        return res.status(500).json({ message:"something went wrong while fetching the subscribed channels", err});  
    }
}


module.exports = {
    toggle_Subscribe,
    get_Channel_Subscribers,
    get_Subscribed_Channels
}