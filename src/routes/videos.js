const express = require("express");
const videoRouter = express.Router();
const upload = require("../middleware/multer");
const verifyJWT = require("../middleware/authorize");
const {   
    get_All_Videos,
    publish_a_Video,
    update_a_Video,
    delete_a_Video,
    get_Video_By_Id
} = require("../controllers/video_controller");


//all are secured routes
videoRouter.use(verifyJWT);


videoRouter.route("/")
.get(get_All_Videos)
.post( upload.fields([
    {
        name:"videoFile",
        maxCount:1
    },
    {
        name:"thumbnail",
        maxCount:1
    }
]), publish_a_Video )

videoRouter.route("/:videoid")
.get(get_Video_By_Id)
.delete( delete_a_Video )
.patch( ( req,res,next ) => {
    try 
    {
        upload.single("thumbnail") ( req, res, (err) =>  next() )
    } 
    catch (err) 
    {
        return res.status(500).json({message:"something bad happened while updating the thumbnail."});
    }
}, update_a_Video )



module.exports = videoRouter;