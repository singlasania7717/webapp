const Comment = require("../models/comment");
const mongoose = require("mongoose");
const {isValidObjectId} = require("mongoose")


const get_Video_Comments = async (req,res) => {
    //get videoId from req.params
    //apply pagination 
    try 
    {
        const { videoId } = req.params;
        if(!isValidObjectId(videoId)) return res.status(400).json({message:"invalid video id"})
        const { page=1, limit=10, sortBy="createdAt", sortType="desc", query="" } = req.query;
        const pageNumber = parseInt(page);
        const limitNumber = parseInt(limit);
        const startIndex = (pageNumber-1)*limit;
        const pipeline = [
            {
                $match:
                {
                    video: new mongoose.Types.ObjectId(videoId)
                }
            },
            {
                $skip: startIndex
            },
            {
                $limit: limitNumber
            }
        ]
        if(sortBy && sortType)
        {
            const sortStage = {
                $sort:{
                    [sortBy]: sortType === "desc" ? -1 : 1 
                }
            }
            pipeline.push(sortStage);
        }
        const comments = await Comment.aggregate(pipeline);
    
        const totalComments = await Comment.countDocuments({video:new mongoose.Types.ObjectId(videoId)});
        const totalPages = Math.ceil(totalComments/limitNumber);
        const hasNextPage = pageNumber < totalPages ;
        const hasPreviousPage = pageNumber > 1;
    
        if(comments.length === 0 ) return res.status(200).json({ message:"NO comments found." });
    
        const response = {
            hasNextPage,
            hasPreviousPage,
            totalComments,
            totalPages,
            comments
        }
    
        return res.status(200).json(response)
    } 
    catch (err) 
    {
        return res.status(500).json({message:"something bad happened while fetching the comments.",err})           
    }
}

const add_Comment = async (req,res) => {
    //have access to req.user._id
    //get content through body
    //get videoId through req.params
    //create a new comment doc
    try 
    {
        const { videoId } = req.params;
        if(!isValidObjectId(videoId)) return res.status(400).json({message:"invalid video id"})
        const { content } = req.body;
        const commentDoc = await Comment.create({
            video: videoId,
            content: content,
            commentBy: req.user._id
        })
        if(!commentDoc) return res.status(500).json({ message:"something wrong happened while creating a comment doc." })
        return res.status(201).json({ commentDoc, message:"comment added successfully." })
    } 
    catch (err) 
    {
        return res.status(500).json({message:"something bad happened while creating the comment.",err})    
    }
}

const update_Comment = async (req,res) => {
    //get commentId by req.params   // becuase we can add multiple comments to same video
    //get new content by req.body
    //and update the doc
    try 
    {
        const { commentId } = req.params;
        if(!isValidObjectId(commentId)) return res.status(400).json({message:"invalid comment id"})
        const { content } = req.body;
        const comment = await Comment.findById(commentId);
        if(!comment) return res.status(400).json({message:"comment not found."})
        comment.content = content;
        await comment.save();
        //alternative
        // const updatedDoc = await Comment.findByIdAndUpdate(
        //     commentId,
        //     {
        //         $set:
        //         {
        //             content
        //         }
        //     },
        //     { new:true }
        // )
        return res.status(200).json({ comment, message:"comment updated successfully." })
    }
    catch (err) 
    {
        return res.status(500).json({message:"something bad happened while updating the comment.",err})  
    }
}

const delete_Comment = async (req,res) => {
    //get commentId by req.params and delete the doc
    try 
    {
        const { commentId } = req.params;
        if(!isValidObjectId(commentId)) return res.status(400).json({message:"invalid comment id"})
        const deletedComment = await Comment.findByIdAndDelete(commentId);
        if(!deletedComment) return res.status(400).json({message:"comment not found."});
        return res.status(200).json({ deletedComment, message:"comment deleted successfully" })
    }
    catch (err) 
    {
        return res.status(500).json({message:"something bad happened while deleting the comment.",err})     
    }
}


module.exports = {
    add_Comment,
    update_Comment,
    delete_Comment,
    get_Video_Comments
}