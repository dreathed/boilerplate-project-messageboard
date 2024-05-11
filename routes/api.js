'use strict';
let mongoose = require("mongoose");
let bcrypt = require("bcrypt")

let board = require("../models/board");

module.exports = async function (app) {
  app.route('/api/threads/:board')
    .post(async (req, res) => {
      await mongoose.connect(process.env.DB,{ useNewUrlParser: true, useUnifiedTopology: true })
        bcrypt.hash(req.body.delete_password, 13, (err, hash)=>{
          if(!err){
            let data = new board({board: req.body["board"], text: req.body["text"], delete_password: hash})
            data.save()
            res.send("OK")
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
          for(let reply of thread.replies){
            delete reply.delete_password;
            delete reply.reported;
          }
        }
        res.json(JSON.stringify(data))
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
        data.bumped_on = Date.now()
        let objectId = new mongoose.Types.ObjectId().toString();
        bcrypt.hash(req.body.delete_password, 13, (err, hash) => {
          if(!err){
            data.replies.push({_id: objectId, text: req.body["text"], delete_password: hash, created_on: Date.now(), reported: false})
            data.save()
            res.send("OK")
          }else{
            res.send("an error occured could not save.")
          }
        })
      }
    })
    .get(async (req, res) => {
      await mongoose.connect(process.env.DB,{ useNewUrlParser: true, useUnifiedTopology: true })

      let data = await board.findById(req.query.thread_id).select({delete_password: 0, reported: 0}).exec()

      for(let reply of data.replies){
        delete reply.delete_password;
        delete reply.reported;
      }
      res.json(JSON.stringify(data));
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
