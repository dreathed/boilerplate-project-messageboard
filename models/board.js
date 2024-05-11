let mongoose = require("mongoose");

let thread = mongoose.Schema({
    board: {
      type: String,
      required: true
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
      default: Date.now()
    },
    bumped_on: {
      type: Date,
      default: Date.now()
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

module.exports = mongoose.model("threads", thread);