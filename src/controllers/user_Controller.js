const User = require("../models/user");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { upload_On_Cloudinary, delete_From_Cloudinary }  = require("../utils/cloudinary");
const fs = require("fs");
const validator = require("validator");

//cookie options
const options = {
    httpOnly:true,
    sameSite:"None",
    //secure:true //not allowing to get cookies via req.cookies when using thunderclient so remove it while testing but for chrome it is needed
}

//custom funcn for generating tokens(both) ---> because we will use this funcn often
const generate_Access_And_Refresh_Tokens = async (userid) => {           

    try
    {
        const user =await  User.findById(userid);  
        if(!user) return res.status(404).json({ message:`user with id ${userid} not found. `});

        const accessToken = await user.generate_access_token();
        const refreshToken = await user.generate_refresh_token();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave:false });

        return { accessToken,refreshToken }
    }
    catch(err)
    {
        return res.status(500).json({ err, message:"something went wrong while generating access and refresh tokens !!" });
    }

}


const register_User = async ( req,res ) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res
    try 
    {
        const { username , fullname, email, password } = req.body;
        //check empty fields
        if( !username || !password || !email || !fullname)  return res.status(400).json({ message: " all fields are required. " }) 

        //@ in  email
        // if( !email.includes("@") )  return res.status(400).json({ message: " please enter a valid email. " }) 
        //better method 👇
        if (!validator.isEmail(email)) 
        {
            return res.status(400).json({ message: 'Invalid email address' });
        }
    
        // Validate username 
        if (!/^[a-zA-Z0-9_]+$/.test(username))   
        {   //not even spaces
            return res.status(400).json({ message: 'Invalid username! Only letters, numbers, and underscores are allowed.' });
        }

        //check duplicacy
        const existingUser = await User.findOne({
            $or: [  //these $or ...... are mongoDB operators 
                {
                    username: username.trim().toLowerCase()
                },
                { 
                    email: email.trim().toLowerCase()
                } 
            ]   
        })                                         // or username:username , email:email     if same value as key write once
        if(existingUser) 
        {
            if( req.files.avatar )         //cause we dont need the files then if uploaded
            {
                fs.unlinkSync(req.files.avatar[0].path);
            }
            if( req.files.coverImage )
            {
                fs.unlinkSync(req.files.coverImage[0].path);
            }
            return res.status(409).json({ message:`user with username or email already exists.` })         //conflict
        }
    
        //encrypt the password
        // const hashedPassword = await bcrypt.hash( password, 10 );     no need now (pre-hook)
    
        // for uploading the files firstly get their local paths given by multer. 
        //avatar
        if(!req.files.avatar) 
        {
            if( req.files.coverImage )        //cause we dont need the files then if uploaded
            {
                fs.unlinkSync(req.files.coverImage[0].path);
            }
            return res.status(400).json({ message: "avatar is required." })
        }
        const avatarLocalPath = req.files.avatar[0].path ;       // no need of else becuase we returned the funcn before
        if(!avatarLocalPath) return res.status(500).json({ message: "multer not returning the path correctly for avatar." })
        const avatar = await upload_On_Cloudinary( avatarLocalPath );  
        //check if uploaded correctly or not on cloudinary
        if(!avatar) return res.status(500).json({ message: "file not uploaded on cloudinary." });
        //get the url
        const avatar_url = avatar.url;
        //coverImage
        let coverImageLocalPath = "";            
        let coverImage_url = "";   
        if(req.files.coverImage) 
        { 
            coverImageLocalPath = req.files.coverImage[0].path ; 
            if(!coverImageLocalPath) return res.status(500).json({ message: "multer not returning the path correctly." })
            coverImage = await upload_On_Cloudinary(coverImageLocalPath);
            if(!coverImage) return res.status(500).json({ message: "coverImage not uploaded on cloudinary correctly for cover image." });
            coverImage_url = coverImage.url;
        }   

        //create entry 
        const user = await User.create(/*data*/
            {
                username,                      // _id will be auto generated in db 
                // password:hashedPassword,
                avatar: avatar_url,
                coverImage: coverImage_url,
                password,
                email,
                fullname
            })
    
        //remove password and rtoken and check user is created or not 
        const createdUser= await User.findById(user._id).select( "-password -refreshToken" )         // by default all properties are selected so we dont want to send password and rtoken to sent in frontend res
        if(!createdUser) return res.status(500).json({message: "something wrong happend while registeration." })
            
        return res.status(201).json({ createdUser, message: "user registered successfully." });
    } 
    catch (err) 
    {
        return res.status(500).json({ message:"something went wrong while registering the user", err}); 
    }
}

const login_User =async ( req,res ) =>{
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie
    try 
    {
        const { loginInput, password } = req.body;

        //check empty fields   //or  !(username || email)
        if( !loginInput || !password )  return res.status(400).json({ message: "Both feilds are required." }) 
                
        //find user ( can just use username or email)
        // const user = await User.findOne({          //now user not User will be used to call any custom methods or save()
        //    $or: [ 
        //     {
        //         username: username.trim().toLowerCase()
        //     },
        //     { 
        //         email: email.trim().toLowerCase()
        //     } 
        // ]
        // });
        /* better method 👇 */
        const isEmail = validator.isEmail(loginInput)
        const user = isEmail ? await User.findOne({email: loginInput.trim().toLowerCase()}) : await User.findOne({username: loginInput.trim().toLowerCase()})
        if(!user) return res.status(404).json({ message: `user not found.` })
    
        //validate the password
        const isPasswordValid = await bcrypt.compare( password, user.password );
        if(!isPasswordValid) return res.status(401).json({ message:"wrong password."});       //invalid credentials
    
        //now password is validated so generate access and refresh tokens
        const { accessToken,refreshToken } = await generate_Access_And_Refresh_Tokens(user._id);
    
        const loggedInUser = await User.findById(user._id).select( "-password -refreshToken" );
    
        //cookies ( options on top global scope )
        return res
        .status(200)
        .cookie( "accessToken", accessToken, options )
        .cookie( "refreshToken", refreshToken, options )
        .json({ loggedInUser , accessToken , refreshToken , message: "user logged in successfully." });
    } 
    catch (err)
    {
        return res.status(500).json({ message:"something went wrong while user authentication ", err});    
    }
}

const logout_User =async ( req,res ) =>{
    try {
        const {_id} = req.user        
        const newuser = await User.findByIdAndUpdate(
            _id,
            {
                $set: { refreshToken:"" }
            },
            {
                new: true     //will return the updated user 
            }
        );
        await newuser.save({ validateBeforeSave:false });
        // or 
        // const newuser = await User.findById(_id);
        // newuser.refreshToken = "";
        // await newuser.save({validateBeforeSave:false});
    
        return res
        .status(200)
        .clearCookie( "accessToken", options )
        .clearCookie( "refreshToken", options )
        .json({ message: "user logged out successfully." });
    } catch (err) 
    {
        return res.status(500).json({ message:"something went wrong while logging out user", err});  
    }
}
  
const refresh_Access_Token = async (req,res) => {
    try 
    {
        const receivedRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;
        if(!receivedRefreshToken) return res.status(401).json({ message: "unauthorized user." });
    
        //check valid or not 
        const decodedToken = jwt.verify(
            receivedRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
        if(!decodedToken) return res.status(401).json({ message: "invalid refresh token" });
    
        //get a user having same data then match its refreshtoken to check if token is already used or not 
        const user =await  User.findById( decodedToken._id );
        if(!user) return res.status(401).json({ message: "invalid refresh token"});
    
        if( user.refreshToken !== receivedRefreshToken )
        return res.status(403).json({ message: "token is either expired or already used. "});
    
        // generate new tokens ( both** )
        const { accessToken,refreshToken } = await generate_Access_And_Refresh_Tokens(user._id);
    
        return res
               .status(200)
               .cookie( "accessToken", accessToken, options )
               .cookie( "refreshToken", refreshToken, options )
               .json({ accessToken, refreshToken, message: "Tokens created successfully." });
    } 
    catch (err) 
    {
        return res.status(500).json({ message: "something bad happend while refreshing the token", err });
    }
}

const change_Current_Password =async ( req,res ) =>{
    try 
    {
        const { oldPassword, newPassword, confirmedPassword } = req.body; 
    
        //check for empty fields
        if( !oldPassword || !newPassword || !confirmedPassword ) 
        return res.status(400).json({ message: "please fill all the required fields." });
        //check for new===old
        if( oldPassword === newPassword )
        return res.status(400).json({ message: "new password should not match the previous password." });
        //check for new===confirm
        if( newPassword !== confirmedPassword )
        return res.status(400).json({ message: "confirm password should be same as new password." });
    
        // find user by _id because of veerifyJWT middleware we have req.user directly
        const user = await User.findById( req.user._id );

        //check for oldPassword to be correct
        const isPasswordValid = await bcrypt.compare( oldPassword, user.password );
        if( !isPasswordValid ) return res.status(401).json({ message: "wrong password." });

        //updating the password
        user.password = newPassword;
        await user.save({ validateBeforeSave:false });

        return res.status(200).json({ message: "password updated successfully." });
    } 
    catch (err) 
    {
        return res.status(500).json({ message: "something bad happened while updating the password.", err });
    }
}

const get_Current_User = async ( req,res ) => {
    try 
    {
        const user = req.user;
        return res.status(200).json(user);
    } 
    catch (error) 
    {
        return res.status(500).json({ message: 'something bad happened while fetching the current user' });
    }
}

const update_Account_Details = async ( req,res ) => {
    try 
    {
        //only allowing email and fullname to update  ( images or any file updates are better to handle in separate controllers )
        const { fullname, email, password } = req.body;     //we are taking password to confirm the user
    
        // check for empty fields
        if( !fullname || !email || !password ) 
        return res.status(400).json({ message: "please fill all the required fields." });
    
        if (!validator.isEmail(email)) 
        {
            return res.status(400).json({ message: 'Invalid email address' });
        }

        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: 
                {
                    fullname: fullname.trim().toLowerCase(),  // pre hook wont be applied becuase we have said validateBeforeSave:false
                    email: email.trim().toLowerCase()
                }
            },
            { new:true }
        ) // not saved yet
    
        //check validity of password before saving
        const isPasswordValid = await bcrypt.compare( password,user.password );
        if(!isPasswordValid) return res.status(400).json({ message:"wrong password." });
    
        await user.save({ validateBeforeSave:false });

        return res.status(200).json({ message: "Account details updated successfully." });
    } 
    catch (err) 
    {
        return res.status(500).json({ message:"something bad happened while updating account details.", err });
    }
}

const update_Cover_Image = async ( req,res ) => {
    try 
    {
       // console.log(req.file);
       if(!req.file) return res.status(400).json({ message: "cover image is required." });       //now it is working after adding try catch in the multer middleware see in users.js
        const coverImageLocalPath = req.file.path ;
        if(!coverImageLocalPath) return res.status(500).json({ message: "multer not returning the updated local path correctly for cover image." });
        
        const updatedCoverImage = await upload_On_Cloudinary(coverImageLocalPath); 
        if(!updatedCoverImage) return res.stauts(500).json({ message: "updated cover image is not uploaded on cloudinary." });
    
        const user = await User.findByIdAndUpdate(
            req.user._id,
            {
                $set:{ coverImage: updatedCoverImage.url }
            },
            { new: true }
        ).select( "-password -refreshToken");
        await user.save({ validateBeforeSave: false });

        //delete old file from cloudinary
        const deletedCoverImage = await delete_From_Cloudinary(req.user.coverImage);
        if( deletedCoverImage !== "ok" ) return res.status(500).json({message:"file not deleted from cloudinary." })
            
        return res.status(200).json({ user, message:"cover image updated successfully."});
    } 
    catch (err) 
    {
       res.stauts(500).json({message:"something went wrong while updating cover image.",err});
    }
}

const update_Avatar = async ( req,res ) => {
    try 
    {
        // console.log(req.file);
        if(!req.file) return res.status(400).json({ message: "avatar is required." });       //now it is working after adding try catch in the multer middleware see in users.js
        const avatarLocalPath = req.file.path ;
        if(!avatarLocalPath) return res.status(500).json({ message: "multer not returning the updated local path correctly for avatar." });
        
        const updatedAvatar = await upload_On_Cloudinary(avatarLocalPath); 
        if(!updatedAvatar) return res.stauts(500).json({ message: "updated avatar is not uploaded on cloudinary." });
    
        const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{ avatar: updatedAvatar.url }
        },
        { new: true }
        ).select( "-password -refreshToken");
        await user.save({ validateBeforeSave: false });

        //delete old file from cloudinary
        const deletedAvatar = await delete_From_Cloudinary(req.user.avatar);
        if( deletedAvatar !== "ok" ) return res.status(500).json({message:"file not deleted from cloudinary." })
        
        return res.status(200).json({ user, message:"avatar updated successfully."});
    } 
    catch (err) 
    {
       res.status(500).json({message:"something went wrong while updating avatar.",err});
    }
}

const get_Channel_Profile = async ( req,res ) => {
    
    try {
        const { username } = req.params;
        if(!username?.trim()) return res.status(400).json({ message: "username is missing." })
    
        //setting the pipelines
        const channel = await User.aggregate([
            //stage 1 ===> finding the required user specified by url params
            {
                $match: { username: username.trim().toLowerCase() }
            },
            //stage2 ===> adding the followers field to it 
            {
                $lookup:
                {
                    from:"subscriptions",
                    localField:"_id",
                    foreignField:"channel",
                    as:"subscribers"             //array of objects
                }
            },
            //stage3 ===> finding the channels this user has subscribed
            {
                $lookup:
                {
                    from:"subscriptions",
                    localField:"_id",
                    foreignField:"subscriber",
                    as:"subscribedTo"           //array of objects
                }
            },
            //stage4 ==> adding the count fields
            {
                $addFields:
                {
                    subscribersCount:{ $size:"$subscribers" },
                    subscribedToCount:{ $size:"$subscribedTo" },
                    isSubscribed: //boolean(whether to show subscribe button or subscribed)
                    {
                        $cond:
                        {
                            if:{ $in:[ req.user._id, "$subscribers.subscriber" ] },             // the subscriber is nothing but the id as its value so these are direclty getting matched here
                            then: true,
                            else: false
                        }
                    }
                }
            },
            //stage5 ==> we want to send selected fields in return to the const channel
            {
                $project:
                {
                    username: 1,
                    fullname: 1,
                    avatar: 1,
                    coverImage: 1,
                    subscribedToCount: 1,
                    subscribersCount: 1,
                    isSubscribed: 1
                }
            }
        ])
         
        //we will get the array of all the matched users(objects/docs) but here in this case it will be only one since unique username
        //console.log(channel);
    
        if(!channel?.length) return res.status(404).json({ message:"channel doesn't exist" });
    
        return res.status(200).json({channel: channel[0] ,message:"channel fetched successfully" });
    } 
    catch (err) 
    {
        return res.status(500).json({message:"something bad happened while getting the channel profile",err})     
    }
}

const get_watch_history = async ( req,res ) => {
    
    try {
        //pipelines
        const user = await User.aggregate([/*pipeline*/
            //stage  
            {
                $match:
                {
                    _id: new mongoose.Types.ObjectId(req.user._id)        //because these are mongodb oprs so no auto conversion by mongoose
                } 
            },
            //stage
            {
                $lookup:
                {                // will return the user populated with watchHistory array having all detailed video objects 
                    from:"videos",
                    localField:"watchHistory",
                    foreignField:"_id",
                    as:"watchHistory",            //overwrite
                    //sub-pipeline, we can use sub-pipeline option for every lookup
                    pipeline:
                    [                    //it will populate the owner field and return the video details
                        //sub-stage
                        {
                            $lookup:
                            {          //this will populate the owner field but will be an array having one object[0] but we dont to use[0] so we can use addfields to overwrite
                                from:"users",
                                localField:"owner",
                                foreignField:"_id", 
                                as:"owner",
                                //sub-pipeline
                                pipeline:
                                [        // so jb ye lookup owner field mein data paste krega toh partial hi krega becuase we don't need everything about the user 
                                    //sub-stage
                                    {
                                        $project:
                                        {
                                            fullname: 1,
                                            username: 1,
                                            avatar: 1
                                        }
                                    }
                                ]              //overwrite
                            }
                        },// can add more sub pipelines here now to specify the str of the video owner output becuase right now the pipeline was about to populate the owner field as array where[0] has the object having firstname and stuff.....
                        {
                            $addFields:
                            {
                                owner:
                                {      //overwrite******
                                    $first: "$owner"                    // other syntax $arrayElemAt: [" $owner ",0]
                                },
                                views:
                                {
                                    $size:"$views"
                                }
                            }
                        }
    
                    ]  
                }
            }// we dont want to format this becuase we want array only and it has multiple elements ( video objects ) not only at[0] 
            //but could have used project here if want to decide what fields in the user model to send 
        ])
    
        //here we are just sending history using dot
        return res.status(200).json({watchHistory: user[0].watchHistory ,message:"watch history fetched successfully"});
    } 
    catch (err) 
    {
        return res.status(500).json({message:"something bad happened while getting the watch history",err})    
    }
}



module.exports = { 
    register_User, 
    login_User, 
    logout_User, 
    refresh_Access_Token, 
    change_Current_Password, 
    get_Current_User, 
    update_Account_Details, 
    update_Cover_Image, 
    update_Avatar,
    get_Channel_Profile ,
    get_watch_history

};