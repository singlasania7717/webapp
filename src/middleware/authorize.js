const jwt = require("jsonwebtoken");
const User = require("../models/user");

const verifyJWT = async ( req,res,next ) => {

    try 
    {
        const accessToken = req.cookies?.accessToken || req.headers["authorization"]?.split(" ")[1];     //sometimes it could be capital A 
        if(!accessToken) return res.status(401).json({ message: "unauthorized user" });

        const decodedToken = jwt.verify( accessToken , process.env.ACCESS_TOKEN_SECRET ); 
        if(!decodedToken) return res.status(403).json({ message: "forbidden user" });

        //since token is valid but is this id user in oue db or not
        const user = await User.findById(decodedToken._id).select( "-password -refreshToken" );
        if(!user)  return res.status(401).json({ message: "invalid access token." }); 

        req.user = user ;           // we set a custom property name user in the req object so now after the middleware we can directly get the user without password and refreshToken
        next();        
    } 
    catch (err) 
    {
        console.log("something went wrong while authorizing ",err);
    }

}

module.exports = verifyJWT;