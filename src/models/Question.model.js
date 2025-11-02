import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  articleId: { 
    type: String, 
    required: true 
  },
  userId: { 
    type: String, 
    required: true 
  },
  question: { 
    type: String, 
    required: true 
  },
  answer: {
    type: String,
    default: null
  },
  answeredBy: {
    type: String,
    default: null
  },
  answeredAt: {
    type: Date,
    default: null
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  enabled: {
    type: Boolean,
    default: true
  }
});

const Question = mongoose.model("Question", questionSchema);
export default Question;
