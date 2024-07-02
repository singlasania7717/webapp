const mongoose = require("mongoose");
const mongooseAggregatePaginate = require("mongoose-aggregate-paginate-v2");

const videoSchema = new mongoose.Schema({

    description:{
        type:String,
        required:true
    },
    thumbnail:{
        type:String,                //cloudinary url
        required:true
    },
    duration:{                //from cloudinary
        type:Number,
        required:true
    },
    title:{
        type:String,
        required:true
    },     
    owner:{                 // as soon as user publish a video we will set his id to its value and then use lookup to get full data  
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    videoFile:{
        type:String,                //cloudinary url
        required:true
    },
    views:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],
    // isPublished:{
    //     type:Boolean,
    //     required:true
    // }

},{ timestamps:true })



videoSchema.methods.increment_Views = async function (userid) {
    if(this.views.includes(userid)) return "true";
    this.views.push(userid);
    return this.save({validateBeforeSave:false});
}

videoSchema.plugin(mongooseAggregatePaginate)


const Video = mongoose.model( "Video",videoSchema );
module.exports = Video;