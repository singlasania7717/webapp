const Tweet = require("../models/tweet");
const mongoose = require("mongoose");
const { isValidObjectId } = require("mongoose");

const get_User_Tweets = async (req,res) => {
    //get userId from params
    //find tweet docs with this userid  // one can do multiple tweets
    //will have to populate the tweetBy field (user)
    //add like & dislike field 
    //add pagination
    try 
    {
        const { userId } = req.params;
        if(!isValidObjectId(userId)) return res.status(400).json({message:"invalid user id"})

        const { page=1, limit=10 } = req.query;
        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);
        const startIndex = (pageNumber-1)*limitNumber;
    
        const pipeline = 
        [
            {
                $match:
                {
                    tweetBy: new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $skip: startIndex
            },
            {
                $limit: limitNumber
            },
            {
                $sort: { createdAt: -1 }
            },
            {  //populating the user field
                $lookup:
                {
                    from:"users",                
                    localField:"tweetBy",
                    foreignField:"_id",
                    as:"tweetBy",
                    pipeline:
                    [
                        {
                            $project:
                            {
                                username:1,
                                fullname:1,
                                avatar:1,
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
                    foreignField:"tweet",
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
            {
                $lookup:
                {
                    from:"likes",
                    localField:"_id",
                    foreignField:"tweet",
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
            {
                $addFields:
                {
                    likes:{ $size: "$likes"},
                    dislikes:{ $size: "$dislikes"}
                }
            }
        ]
        const tweets = await Tweet.aggregate(pipeline);
        if(tweets.length === 0) return res.status(200).json({ message: "NO tweets found." })
    
        const totalTweets = await Tweet.countDocuments({tweetBy: new mongoose.Types.ObjectId(userId)})
        const totalPages = totalTweets/limitNumber;
        const hasPreviousPage = pageNumber > 1;
        const hasNextPage = pageNumber < totalPages;
    
        const response = {
            hasNextPage,
            hasPreviousPage,
            totalPages,
            totalTweets,
            tweets
        }
    
        return res.status(200).json({ tweets, message: "tweets fetched successfully." })
    } 
    catch (err) 
    {
        return res.status(500).json({ message:"something went wrong while fetching the tweets", err});     
    }
}

const create_Tweet = async (req,res) => {
    //have access to req.user._id                     
    //get content through body            // tweets are a separate field , there is no such thing as tweet on video like we have comment on video
    //create a new Tweet doc
    try 
    {
        const { content } = req.body;
        const tweetDoc = await Tweet.create({
            content: content,
            tweetBy: req.user._id
        })
        if(!tweetDoc) return res.status(500).json({ message:"something wrong happened while creating a tweet doc." })
        return res.status(201).json({ tweetDoc, message:"Tweet added successfully." })
    } 
    catch (err) 
    {
        return res.status(500).json({message:"something bad happened while creating the tweet.",err})    
    }
}

const update_Tweet = async (req,res) => {
    //get tweetId by req.params  
    //get new content by req.body
    //and update the doc
    try 
    {
        const { tweetId } = req.params;
        if(!isValidObjectId(tweetId)) return res.status(400).json({message:"invalid tweet id"})

        const { content } = req.body;
        const tweet = await Tweet.findById(tweetId);
        if(!tweet) return res.status(400).json({message:"Tweet not found."})
        tweet.content = content;
        await tweet.save();
        //alternative
        // const updatedDoc = await Tweet.findByIdAndUpdate(
        //     tweetId,
        //     {
        //         $set:
        //         {
        //             content
        //         }
        //     },
        //     { new:true }
        // )
        return res.status(200).json({ tweet, message:"Tweet updated successfully." })
    }
    catch (err) 
    {
        return res.status(500).json({message:"something bad happened while updating the Tweet.",err})  
    }
}

const delete_Tweet = async (req,res) => {
    //get tweetId by req.params and delete the doc
    try 
    {
        const { tweetId } = req.params;
        if(!isValidObjectId(tweetId)) return res.status(400).json({message:"invalid tweet id"})

        const deletedTweet = await Tweet.findByIdAndDelete(tweetId);
        if(!deletedTweet) return res.status(400).json({message:"Tweet not found."});
        return res.status(200).json({ deletedTweet, message:"Tweet deleted successfully" })
    }
    catch (err) 
    {
        return res.status(500).json({message:"something bad happened while deleting the Tweet.",err})     
    }
}


module.exports = {
    get_User_Tweets,
    create_Tweet,
    update_Tweet,
    delete_Tweet,
}