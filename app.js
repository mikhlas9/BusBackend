require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer")
const path = require("path");
const fs = require('fs');
const nodemailer = require("nodemailer")
const dotenv = require("dotenv");
const md5 = require("md5");
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 5000;

const sendGridTransport = require('nodemailer-sendgrid-transport');
// const {SENDGRID_API} = require('./config/keys');
const SENDGRID_API = process.env.SENDGRID_API;

dotenv.config();


const app = express();


app.use(express.json())
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect(`${MONGO_URI}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }).then(()=> console.log("DATABASE CONNECTED"))
  .catch((err)=> console.log("error"));




const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });


const imageSchema = new mongoose.Schema({
  name: String,
  destination: String,
  department: String,
  date: String,
  fee: String,
  email: String,
  paid: {
        type: Boolean,
        default: false
    },
  image: {
    data: Buffer,
    contentType: String
  }
});

const Image = mongoose.model('Image', imageSchema);


const userSchema = new mongoose.Schema({
  email: String,
  password: String
  
});
const User = mongoose.model("User", userSchema);


const astudentsSchema = new mongoose.Schema({
  name: String,
  destination: String,
  department: String,
  tick: [imageSchema]
  
});
const AStudents = mongoose.model("AStudents", astudentsSchema);


app.post("/students", async (req,res) => {
  const {name, destination, department} = req.body;
  console.log(req.body.name);
  try{
    const newstudent = new AStudents({
        name,
         destination,
         department
      
    });
    await newstudent.save() ;
     
    res.json({message: "Successfully Booked a Seat"})
  } catch (error) {
   console.error(error);
   
   res.json({message: "Failed To Book A Seat"})
  }
})

app.get("/students", async (req, res) => {
   try{
    const allStudents = await AStudents.find();
    res.json(allStudents);
   }catch{
    console.error(error);
    res.status(500).send('Failed to fetch students.');
   }
})


app.post("/register", async (req,res) => {
  const {email, password} = req.body;
 const user = await User.findOne({email});
 
  if(user){
      res.json({message: "user already registerd"})
  }else{
      const newUser = new User({
          email,
           password: md5(password)
       });
       newUser.save();
       res.json({message: "Registration successfull"});
  }
 
    
});

app.post("/login", async (req,res) => {
  const {email,password} = req.body;
  const user = await User.findOne({email});

  if(user){
      if(md5(password) === user.password){
          res.json({message: "Login successfull", user: user})
      }else{
          res.json({message: "Incorrect Password"})
      }
  }else{
      res.json({message: "user not found"})
  }
})




app.post('/upload', upload.single('myImage'), async (req, res) => {
  try{
  if (!req.file) {
    req.body.image = {
      data: fs.readFileSync('./uploads/cash.jpeg'),
      contentType: 'image/jpeg'
    };
  } else {
    req.body.image = {
      data: fs.readFileSync(req.file.path),
      contentType: req.file.mimetype
    };
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }

  // const newImage = new Image();
  // newImage.name = req.body.name;
  // newImage.destination = req.body.destination;
  // newImage.department = req.body.department;
  // newImage.date = req.body.date;
  // newImage.fee = req.body.fee;
  // newImage.email = req.body.email;
  // newImage.image.data = fs.readFileSync(req.file.path);
  // newImage.image.contentType = req.file.mimetype;

  const newImage = new Image({
    name: req.body.name,
    destination: req.body.destination,
    department: req.body.department,
    date: req.body.date,
    fee: req.body.fee,
    email: req.body.email,
    image: req.body.image
  });


 await newImage.save();

 res.json({message: "file uploaded successfully"})
} catch (error) {
 console.error(error);
 
 res.json({message: "failed to upload the file"})
}
});


app.get('/images', async (req, res) => {
  try {
    const images = await Image.find({});
    res.json(images);
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to fetch images.');
  }
});

app.get('/students/:date', async (req, res) => {
  const date = req.params.date;
  
  // Filter students based on the provided date
  const filteredStudents =  await Image.find({date});
  
  res.json(filteredStudents);

});



app.post('/send',  async (req, res) => {
  // Get the necessary details from the request body
  const {studentId,recipient, subject, message } = req.body;
  try {

  const student = await Image.findById(studentId);

  // Create a transporter using nodemailer
  const transporter = nodemailer.createTransport(sendGridTransport({
    auth:{
    api_key:SENDGRID_API
    }
    }))

  const info = await transporter.sendMail({
    to:recipient,
    from: 'mohammadikhlas99@gmail.com',
    subject:subject,
    html:`<p>${message}</p>`
    });
 res.json({info});
    student.paid = true;
    await student.save();
 

  }catch(err) {
    console.log(err)
    }
});



app.listen(PORT, function () {
    console.log(`port running at 5000`);
});