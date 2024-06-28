const loginBtn = document.querySelector("#login-btn");
const getUserBtn = document.querySelector("#get-user-btn");
const registerBtn = document.querySelector("#register-btn");
const updateBtn = document.querySelector("#update-btn");
const publishBtn = document.querySelector("#publish-btn");



/* const header = new Headers({
    'authorization': `Bearer ${bearerToken}`,
    'Content-Type': 'application/json'  // Adjust this if needed
})
or directly put the headers */

//register a user
registerBtn.addEventListener("click",(e)=>{
    e.preventDefault();
    const registerForm = document.querySelector("#register-form");

    const formData = new FormData();

    formData.append('username', registerForm.firstElementChild.value);
    formData.append('fullname', registerForm.children[1].value);
    formData.append('email', registerForm.children[2].value);
    formData.append('password', registerForm.children[3].value);
    formData.append('avatar', registerForm.children[4].files[0]);
    formData.append('coverImage', registerForm.children[5].files[0]);

    fetch("http://localhost:5000/api/v1/users/register",{
        method:"POST",
        // headers: { "Content-Type": "application/json" },      // FormData() sets it automatically (if inly text data can use both approach (json.stringify and formdata but if have files then use formdata only))
        credentials: "include",
        body: formData
    })
    .then( response => 
        {console.log(response);
         return response.json()} )
    .then( data => {console.log(data)} )
    .catch( error =>{ console.log("error: ",error)})
})

//login the user
loginBtn.addEventListener("click",(e)=>{
    e.preventDefault();
    const username = document.querySelector(".username");
    const password = document.querySelector(".password");
    const email = document.querySelector(".email");

    fetch("http://localhost:5000/api/v1/users/login",
        {//options
            method:"POST",
            headers: { "Content-Type": "application/json" },
            credentials:"include", // if using cookies it is required ,but then you can't use * origin restrict it to particulars as we did 
            body: JSON.stringify({
                username: username.value,
                password: password.value,
                email: email.value
            })
        })
    .then( response => response.json() )
    .then( data => console.log(data) )
    .catch( error => console.log("error: ",error.message))
})

//getting current user 
getUserBtn.addEventListener( "click", (e)=>{
    fetch("http://localhost:5000/api/v1/users/current-user",{
        method:"GET",
        //headers: { 'authorization': `Bearer ${accessToken}`},  // sometimes it could be capital 'A' // in case cookies doesn't work ex: mobile apps or some erro , so will also have to store accesstoken in a variable 
        credentials:"include", 
    })
    .then( response => response.json() )
    .then( data => console.log(data) )
    .catch( error => console.log("error: ",error.message) )
})

//update account details
updateBtn.addEventListener("click",(e)=>{
    e.preventDefault();
    const updateDetailsForm = document.querySelector("#update-details-form")
    const fullname = updateDetailsForm.children[0];
    const email = updateDetailsForm.children[1];
    const password = updateDetailsForm.children[2];
    
    fetch("http://localhost:5000/api/v1/users/update-account",{
        method:"PATCH",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
            email: email.value,
            fullname: fullname.value,
            password: password.value
        }),
        credentials:"include"
    })
    .then( response => response.json() )
    .then( data => console.log(data) )
    .catch( error => console.log("error: ",error) )
})

//publish a video 
publishBtn.addEventListener("click",(e)=>{
    e.preventDefault();
    const publishVideoForm = document.querySelector("#publish-video-form");
    //will have to use FormData()
    const formdata = new FormData();
    formdata.append("videoFile",publishVideoForm.children[0].files[0]);
    formdata.append("thumbnail",publishVideoForm.children[1].files[0]);
    formdata.append("title",publishVideoForm.children[2].value);
    formdata.append("description",publishVideoForm.children[3].value);

    fetch("http://localhost:5000/api/v1/videos/",{
        method:"POST",
        credentials:"include",
        body: formdata
    })
    .then( response => response.json() )
    .then( data => console.log(data) )
    .catch ( error => console.log(error) )
})


