const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const imageDownloader = require('image-downloader');
const {S3Client, PutObjectCommand} = require('@aws-sdk/client-s3');
const multer = require('multer');
const fs = require('fs');
const mime = require('mime-types')
require('dotenv').config();
const User = require('./models/User');
const Place = require('./models/Place');
const Booking = require('./models/Booking');

const app = express();

const bcryptSalt = bcrypt.genSaltSync(10);
const Secret = 'JBDVCY87EGWBHa78uheuiA8UHYXW8ghxuiba'
const bucket = process.env.BUCKET_NAME;
const allowedOrigins = ['http://localhost:5173', 'https://hoteli-sable.vercel.app'];

app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname+'/uploads'))
app.use(cors({
    origin: function(origin, callback) {
      // Check if the request origin is allowed
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  }));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin','https://hoteli-sable.vercel.app');
    res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE');
    res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');
    next();
});
  



async function uploadToS3(path, originalFilename, mimetype) {
    const client = new S3Client({
        region: 'eu-north-1', 
        credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        },
    });
    const parts = originalFilename.split('.');
    const ext = parts[parts.length - 1];
    const newFilename = Date.now() + '.' + ext;
    await client.send(new PutObjectCommand({
        Bucket: bucket,
        Body: fs.readFileSync(path),
        Key: newFilename,
        ContentType: mimetype,
        ACL: 'public-read',
    }));
    return `https://${bucket}.s3.amazonaws.com/${newFilename}`;
}

function getUserDataFromReq(req) {
    return new Promise((resolve, reject) => {
        jwt.verify(req.cookies.token, Secret, {}, async (err, userData) => {
            if (err) throw err;
            resolve(userData);
        });
    });
}

app.post('/api/register', async (req, res) => {
    mongoose.connect(process.env.MONGO_URL);
    const {name,email,password} = req.body;
    try {
        const userDoc = await User.create({
            name,
            email,
            password: bcrypt.hashSync(password, bcryptSalt),
        });
    } catch (e) {
        res.status(422).json(e);
    }
})

app.post('/api/login', async (req, res) => {
    mongoose.connect(process.env.MONGO_URL);
    const {email, password} = req.body;
    const userDoc = await User.findOne({email});
    if (userDoc) {
        const passOk = bcrypt.compareSync(password, userDoc.password);
        if (passOk) {
            jwt.sign({email:userDoc.email, id:userDoc._id, name:userDoc.name},  Secret, {}, (err,token) => {
                if (err) throw err;
                res.cookie('token', token).json(userDoc);
            });
        } else {
            res.status(422).json('Incorrect Password');
        }
    } else {
        res.json('user not  found');
    }
})

app.get('/api/profile', (req, res) => {
    mongoose.connect(process.env.MONGO_URL);
    const {token} = req.cookies;
    if (token) {
        jwt.verify(token, Secret, {}, (err, user) => {
            if (err) throw err;
            res.json(user);
        })
    } else {
        res.json(null);
    }
});

app.post('/api/logout', (req, res) => {
    res.cookie('token', '').json(true);
});

app.post('/api/upload-by-link', async (req, res) => {
    mongoose.connect(process.env.MONGO_URL);
    const {link} = req.body;
    const newName = 'photo' + Date.now() + '.jpg';
    await imageDownloader.image({
        url: link,
        dest:'/tmp/' +newName,
    });
    const url = await uploadToS3('/tmp/' +newName, newName, mime.lookup('/tmp/' +newName));
    res.json(url);
});

const photosMiddleware = multer({dest:'/tmp'});
app.post('/api/upload', photosMiddleware.array('photos', 100), async (req, res)=>{
    const uploadedFiles = [];
    for (let i = 0; i < req.files.length; i++) {
        const {path,originalname,mimetype} = req.files[i];
        const url = await uploadToS3(path, originalname, mimetype);
        uploadedFiles.push(url);
    }
    res.json(uploadedFiles);
});

app.post('/api/places', (req, res) => {
    mongoose.connect(process.env.MONGO_URL);
    const {token} = req.cookies;
    const { 
        title, address,addedPhotos,
        description,perks,extraInfo,
        checkIn,checkOut,maxGuests,price,
    } = req.body;
    jwt.verify(token, Secret, {}, async (err, userData) => {
        if (err) throw err;
        const placeDoc = await Place.create({
            owner: userData.id,
            title, address,photos:addedPhotos,
            description,perks,extraInfo,
            checkIn,checkOut,maxGuests,price
        });
        res.json(placeDoc);
    });
});

app.get('/api/user-places', (req, res) => {
    mongoose.connect(process.env.MONGO_URL);
    const {token} = req.cookies;
    jwt.verify(token, Secret, {}, async (err, userData) => {
        const {id} = userData;
        res.json( await Place.find({owner:id}))
    });
});

app.get('/api/places/:id', async (req, res) => {
    mongoose.connect(process.env.MONGO_URL);
    const {id} = req.params;
    res.json(await Place.findById(id));
});

app.put('/api/places', async (req, res) => {
    mongoose.connect(process.env.MONGO_URL);
    const {token} = req.cookies;
    const { 
        id, title, address,addedPhotos,
        description,perks,extraInfo,
        checkIn,checkOut,maxGuests,price,
    } = req.body;
    jwt.verify(token, Secret, {}, async (err, userData) => {
        const placeDoc = await Place.findById(id);
        if (userData.id === placeDoc.owner.toString()) {
            placeDoc.set({
                title, address,photos:addedPhotos,
                description,perks,extraInfo,
                checkIn,checkOut,maxGuests,price
            });
            await placeDoc.save();
            res.json('ok');
        }
    });
});

app.get('/api/places', async (req, res) => {
    mongoose.connect(process.env.MONGO_URL);
    res.json( await Place.find() );
});

app.post('/api/bookings', async (req, res) => {
    mongoose.connect(process.env.MONGO_URL);
    const userData = await getUserDataFromReq(req);
    const {
        place,checkIn,checkOut,
        numberOfGuests,name,phone,price,
    } = req.body;
    Booking.create({
        place,checkIn,checkOut,
        numberOfGuests,name,phone,price,
        user:userData.id,
    }).then((doc) => {
        res.json(doc);
    }).catch ((err) => {
        throw err;
    })
});

app.get('/api/bookings', async (req, res) => {
    mongoose.connect(process.env.MONGO_URL);
    const userData = await getUserDataFromReq(req);
    res.json( await Booking.find({user:userData.id}).populate('place') );
});



if (process.env.API_PORT) {
    app.listen(process.env.API_PORT, () => {
        console.log('Server running on Port 4000');
    });
}

module.exports = app;