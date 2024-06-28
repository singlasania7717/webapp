const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const cookieParser = require("cookie-parser");

//const allowedOrigins = process.env.ORIGIN.split(',');   //array

app.use( (req,res,next)=>{                                // copied from davegrey and it worked 😉 for third party cookies and all 
    const origin = req.headers.origin;
    if(process.env.ORIGIN.includes(origin))
    {
        res.header("Access-Control-Allow-Credentials",true);
    }
    next();
})

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || process.env.ORIGIN.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    optionsSuccessStatus: 200,
    // credentials:true
}));

app.use(express.json());
app.use(express.urlencoded({ extended:false }));  
app.use(express.static("../public"));
app.use(cookieParser());


//route importing
const userRouter = require("./routes/users");
const videoRouter = require("./routes/videos");


app.use("/api/v1/users",userRouter);
app.use("/api/v1/videos",videoRouter);




module.exports = app;