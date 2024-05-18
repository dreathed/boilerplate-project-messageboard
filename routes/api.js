'use strict';
let mongoose = require("mongoose");
let bcrypt = require("bcrypt")

let thread = mongoose.Schema({
    board: {
      type: String,
      default: ""
    },
    text: {
      type: String,
      default: ""
    },
    delete_password: {
      type: String,
      required: true
    },
    created_on: {
      type: Date,
      default: new Date()
    },
    bumped_on: {
      type: Date,
      default: new Date()
    },
    replies: {
      type: Array,
      default: []
    },
    reported: {
      type: Boolean,
      default: false
    }
  })

//let board = mongoose.model("threads", thread);
let board = require("../models/board")

module.exports = async function (app) {
  app.route('/api/threads/:board')
    .post(async (req, res) => {
      console.log(req.params)
      await mongoose.connect(process.env.DB,{ useNewUrlParser: true, useUnifiedTopology: true })
        bcrypt.hash(req.body.delete_password, 13, (err, hash)=>{
          if(!err){
            let data = new board({board: req.params["board"], text: req.body["text"], delete_password: hash})
            data.save().then(()=>{
              res.send("OK")
            })
          }else{
            res.send("an error occured could not save.")
          }
        })
    })
    .get(async (req, res) => {
      await mongoose.connect(process.env.DB,{ useNewUrlParser: true, useUnifiedTopology: true })
        let data = await board.find({board: req.params["board"]}).select({delete_password: 0, reported: 0}).sort({bumped_on: "desc"}).exec()
        data = data.slice(0,10);
        for(let thread of data){
          thread.replies.sort((a,b)=>{return b.created_on - a.created_on })
          thread.replies = thread.replies.slice(0,3)
          data.created_on = new Date(data.created_on).toDateString();
          data.bumped_on = new Date(data.bumped_on).toDateString();
          for(let reply of thread.replies){
            reply.created_on = new Date(reply.created_on).toDateString();
            delete reply.delete_password;
            delete reply.reported;
          }
        }
        res.json(data)
    })
    .delete(async (req, res) => {
      await mongoose.connect(process.env.DB,{ useNewUrlParser: true, useUnifiedTopology: true })
      let data = await board.findById(req.body["thread_id"]).exec();
      bcrypt.compare(req.body["delete_password"],data.delete_password, (err, resolve) => {
        if(err){
          res.send("an error occured")
        }else if (resolve){
          board.findByIdAndDelete(req.body["thread_id"]).then(()=>{
            res.send("success")
          });
        }else{
          res.send("incorrect password")
        }
      })
    })
    .put(async (req, res) => {
      await mongoose.connect(process.env.DB,{ useNewUrlParser: true, useUnifiedTopology: true })
      let data = await board.findById(req.body["thread_id"]).exec();
      data.reported = true;
      data.save().then(()=>{
        res.send("reported")
      });
    });
    
  app.route('/api/replies/:board')
    .post(async (req, res)=>{
      await mongoose.connect(process.env.DB,{ useNewUrlParser: true, useUnifiedTopology: true })
      let data = await board.findById(req.body["thread_id"]).exec()
      if(data){
        data.bumped_on = new Date();
        let objectId = new mongoose.Types.ObjectId().toString();
        bcrypt.hash(req.body.delete_password, 13, (err, hash) => {
          if(!err){
            data.replies.push({_id: objectId, text: req.body["text"], delete_password: hash, created_on: new Date(), reported: false})
            data.markModified("bumped_on")
            data.markModified("replies") 
            data.save().then(()=>{
              res.send("OK")
            })
            
          }else{
            res.send("an error occured could not save.")
          }
        })
      }
    })
    .get(async (req, res) => {
      await mongoose.connect(process.env.DB,{ useNewUrlParser: true, useUnifiedTopology: true })

      let data = await board.findById(req.query.thread_id).select({delete_password: 0, reported: 0}).exec()
      data.created_on = new Date(data.created_on).toDateString();
      data.bumped_on = new Date(data.bumped_on).toDateString();
      for(let reply of data.replies){
        reply.created_on = new Date(reply.created_on).toDateString();
        delete reply.delete_password;
        delete reply.reported;
      }
      res.json(data);
    })
    .delete(async (req, res) => {
      await mongoose.connect(process.env.DB,{ useNewUrlParser: true, useUnifiedTopology: true })
      let data = await board.findById(req.body["thread_id"]).exec();
      for(let reply of data.replies){
        if(reply._id == req.body["reply_id"]){
          bcrypt.compare(req.body["delete_password"],reply.delete_password, (err, resolve) => {
            if(err){
              res.send("There was an error");
            }else if(resolve){
              reply.text = "[deleted]";
              data.markModified('replies')
              data.save().then(()=>{
                res.send("success");
              });
              
            }else{
              res.send("incorrect password");
            }
          });
        }
      }
    })
    .put(async (req, res) => {
      await mongoose.connect(process.env.DB,{ useNewUrlParser: true, useUnifiedTopology: true })
      let data = await board.findById(req.body["thread_id"]).exec();
      for(let reply of data.replies){
        if(reply._id == req.body["reply_id"]){
          reply.reported = true;
        }
      }
      data.markModified("replies")
      data.save().then(()=>{
        res.send("reported");
      });
    });
};
