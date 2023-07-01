const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const blogSchema = new Schema({
  title: {
    type: String,
  },
  body: {
    type: String,
    required: true
  },
  createdBy: {
    type: String,
    required: true
  },
  createdById: {
    type: String,
    required: true
  },
  public: {
    type: Boolean,
    required: true
  },
  tags: [{
    type: String
  }]
}, { timestamps: true });

const Blog = mongoose.model('Blog', blogSchema);
module.exports = Blog;