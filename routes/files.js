const router=require("express").Router();
const multer=require("multer");
const path=require('path');
const File=require('../models/file');
const  { v4: uuid4 }=require('uuid');
const file = require("../models/file");


let storage=multer.diskStorage({
    destination:(req,file,cb) => cb(null,'uploads/'),
    filename:(req,file,cb) => {
        const uniquename=`${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;

        cb(null,uniquename);
    }
})

let upload=multer({
    storage,
    limit:{
        fileSize:1000000 * 100
    },

}).single('myfile');

router.post('/',(req,res)=>{
  
   //store file
   upload(req,res, async (err) => {

    //validate request
    if(!req.file){
        return res.json({error: "all files are required."});
    }

      if(err)
      {
          return res.status(500).send({
              error:err.message
          })
      }

      //store into database
        const file=new File({
            filename:req.file.filename,
            uuid:uuid4(),
            path:req.file.path,
            size:req.file.size
        });




         //Response->download link
   const response=await file.save();
   return res.json({file:`${process.env.APP_BASE_URL}/files/${response.uuid}`});


   //http://localhost:3000/files/5644666e6d6wd6wd-ddwdwdwd4161-->yae milega link for download

   });

});

  
router.post('/send', async (req, res) => {
    const { uuid, emailTo, emailFrom, expiresIn } = req.body;
    //validate request
    if(!uuid || !emailTo || !emailFrom) {
        return res.status(422).send({ error: 'All fields are required except expiry.'});
    }
    // Get data from db 
    try {
      const file = await File.findOne({ uuid: uuid });
      if(file.sender) {
        return res.status(422).send({ error: 'Email already sent once.'});
      }
      file.sender = emailFrom;
      file.receiver = emailTo;
      const response = await file.save();
      // send mail
      const sendMail = require('../services/mailService');
      sendMail({
        from: emailFrom,
        to: emailTo,
        subject: 'inShare file sharing',
        text: `${emailFrom} shared a file with you.`,
        html: require('../services/emailTemplate')({
                  emailFrom, 
                  downloadLink: `${process.env.APP_BASE_URL}/files/${file.uuid}?source=email` ,
                  size: parseInt(file.size/1000) + ' KB',
                  expires: '24 hours'
              })
      }).then(() => {
        return res.json({success: true});
      }).catch(err => {
        return res.status(500).json({error: 'Error in email sending.'});
      });
  } catch(err) {
    return res.status(500).send({ error: 'Something went wrong.'});
  }
  
  });
   

module.exports=router;