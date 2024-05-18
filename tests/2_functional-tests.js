const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

let mongoose = require("mongoose");
let board = require("../models/board");
let bcrypt = require("bcrypt")

chai.use(chaiHttp);

suite('Functional Tests', function() {
    let lastId;
    before(function(done){
        // create base data
        let hash = bcrypt.hashSync("123", 13)
        mongoose.connect(process.env.DB,{ useNewUrlParser: true, useUnifiedTopology: true }).then(()=>{
            for(let i=0; i<11; i++){
                let newBoard = new board({board: "abord", text: "text no. " + String(i), delete_password: hash})
                newBoard.save();
                lastId = newBoard._id;
            }
            done();
        })
    });

    after(function(done){
        mongoose.connect(process.env.DB,{ useNewUrlParser: true, useUnifiedTopology: true }).then(()=>{
            board.deleteMany({}).then(function(result){
                console.log("deleted all entries in database: ", result)
                done()
            });
        })
    })

    test("Creating a new thread", function(done){
        chai
            .request(server)
            .keepOpen()
            .post("/api/threads/abord")
            .send({"board": "abord", "text": "this is a test", "delete_password": "todelete"})
            .end(function(err, res){
                assert.equal(res.status, 200, 'Response status should be 200');
                done()
            })
    });

    test("Viewing the 10 most recent threads with 3 replies each", function(done){
        chai
            .request(server).keepOpen()
            .get("/api/threads/abord")
            .end(function(err, res){
                assert.equal(res.status, 200, 'Response status should be 200');
                let jsonBody = res.body;
                assert.isArray(jsonBody, "Response should be a json array");
                assert.equal(jsonBody.length, 10, 'The json array should be of length 10');
                for(let entry of jsonBody){
                    assert.isAtMost(entry.replies.length, 3, 'The replies should be at most of length 3');
                }
                done()
            })
    });

    test("Deleting a thread with the incorrect password", function(done){
        chai
            .request(server).keepOpen()
            .delete("/api/threads/abord")
            .send({"thread_id": lastId, "delete_password": "123123123"})
            .end(function(err, res){
                assert.equal(res.status, 200, 'Response status should be 200');
                assert.equal(res.text, "incorrect password", "On incorrect password the response should be 'incorrect password'");
                done()
            })
    })

    test("Reporting a thread", function(done){
        chai
            .request(server).keepOpen()
            .put("/api/threads/abord")
            .send({"thread_id": lastId})
            .end(function(err, res){
                assert.equal(res.status, 200, 'Response status should be 200');
                assert.equal(res.text, "reported", "On put request the response should be 'reported'");

                mongoose.connect(process.env.DB,{ useNewUrlParser: true, useUnifiedTopology: true }).then(()=>{
                    board.findById(lastId).then((result) => {
                        assert.equal(result.reported, true, "After reporting the value should be set in db.")
                        done();
                    })
                })
            })
    })

    test("posting a reply", function(done){
        chai
            .request(server).keepOpen()
            .post("/api/replies/abord")
            .send({"thread_id": lastId, "delete_password": "123", "text": "a reply text"})
            .end(function(err, res){
                assert.equal(res.status, 200, 'Response status should be 200');

                mongoose.connect(process.env.DB,{ useNewUrlParser: true, useUnifiedTopology: true }).then(()=>{
                    board.findById(lastId).then((result) => {
                        let hasNewReply = false;
                        for(let reply of result.replies){
                            if(reply.text == "a reply text"){
                                hasNewReply = true;
                            }
                        }
                        assert.equal(hasNewReply, true, "After posting a reply, it should show up in the database")
                        done();
                    })
                })
            })
    })

    test("get one thread with all replies", function(done){
        chai
            .request(server).keepOpen()
            .get("/api/replies/abord?thread_id="+lastId)
            .end(function(err, res){
                assert.equal(res.status, 200, 'Response status should be 200');
                let parsedBody = res.body;
                assert.isAtLeast(parsedBody.replies.length, 1, "There should be at least one reply.")
                done()
            })
    })

    test("deleting a reply with an incorrect password", function(done){
        let replyId;
        chai
            .request(server).keepOpen()
            .get("/api/replies/abord?thread_id="+lastId)
            .end(function(err, res){
                assert.equal(res.status, 200, 'Response status should be 200');
                let parsedBody = res.body;
                replyId = parsedBody.replies[0]._id
                chai
                    .request(server).keepOpen()
                    .delete("/api/replies/abord?thread_id="+lastId)
                    .send({"thread_id": lastId, "reply_id": replyId, "delete_password": "wrongPassword"})
                    .end(function(err, res){
                        assert.equal(res.status, 200, 'Response status should be 200');
                        assert.equal(res.text, "incorrect password", "On incorrect password the response should be 'incorrect password'");
                        done()
                    })
            })
    })

    test("reporting a reply", function(done){
        let replyId;
        chai
            .request(server).keepOpen()
            .get("/api/replies/abord?thread_id="+lastId)
            .end(function(err, res){
                assert.equal(res.status, 200, 'Response status should be 200');
                let parsedBody = res.body;
                replyId = parsedBody.replies[0]._id
                chai
                    .request(server).keepOpen()
                    .put("/api/replies/abord")
                    .send({"thread_id": lastId, "reply_id": replyId})
                    .end(function(err, res){
                        assert.equal(res.status, 200, 'Response status should be 200');
                        assert.equal(res.text, "reported", "On incorrect password the response should be 'incorrect password'");
                        
                        mongoose.connect(process.env.DB,{ useNewUrlParser: true, useUnifiedTopology: true }).then(()=>{
                            board.findById(lastId).then((result) => {
                                for(let reply of result.replies){
                                    if(reply._id == replyId){
                                        assert.equal(reply.reported, true, "After reporting the value should be set in db.")
                                    }
                                }
                                done();
                            })
                        })
                    })
            })
    })

    test("deleting a reply with a correct password", function(done){
        let replyId;
        chai
            .request(server).keepOpen()
            .get("/api/replies/abord?thread_id="+lastId)
            .end(function(err, res){
                assert.equal(res.status, 200, 'Response status should be 200');
                let parsedBody = res.body;
                replyId = parsedBody.replies[0]._id
                chai
                    .request(server).keepOpen()
                    .delete("/api/replies/abord?thread_id="+lastId)
                    .send({"thread_id": lastId, "reply_id": replyId, "delete_password": "123"})
                    .end(function(err, res){
                        assert.equal(res.status, 200, 'Response status should be 200');
                        assert.equal(res.text, "success", 'Response text should be "success"');
                        mongoose.connect(process.env.DB,{ useNewUrlParser: true, useUnifiedTopology: true }).then(()=>{
                            board.findById(lastId).then((result) => {
                                for(let reply of result.replies){
                                    if(reply._id == replyId){
                                        assert.equal(reply.text, "[deleted]", "after deleting a reply the text in the database should be '[deleted]'")
                                    }
                                }
                                done();
                            })
                        })
                    })
            })
    })

    test("Deleting a thread with the correct password", function(done){
        chai
            .request(server).keepOpen()
            .delete("/api/threads/abord")
            .send({"thread_id": lastId, "delete_password": "123"})
            .end(function(err, res){
                assert.equal(res.status, 200, 'Response status should be 200');
                assert.equal(res.text, "success", "On correct password the response should be 'success'");

                mongoose.connect(process.env.DB,{ useNewUrlParser: true, useUnifiedTopology: true }).then(()=>{
                    board.findById(lastId).then((result) => {
                        assert.notExists(result, "After deleting, there should be no entry anymore.")
                        done();
                    })
                })
            })
    })
});
