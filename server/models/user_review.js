const mongoose = require('mongoose')

const userReview = mongoose.Schema({
   postId: {
       type: String,
       require: true
   },
   ownerId: {
        type: String,
        require: true
    },
    ownerUsername: {
        type: String,
        require: true,
        trim: true
    },
    titlePost: {
        type: String,
        require: true,
        trim: true
    },
    review: {
        type: String,
        require: true,
        trim: true,
        maxlength: 1500
    },
    rating: {
        type: String,
        require: true,
        trim: true,
        min: 1,
        max: 10
    }
} , {timestamps: true})

const UserReview = mongoose.model('UserReview' , userReview)

module.exports = {UserReview}