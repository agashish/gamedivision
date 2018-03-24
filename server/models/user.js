const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const config = require('./../config/config').get(process.env.NODE_ENV)
const SALT_I = 10

const userSchema = mongoose.Schema({
    username: {
        type: String,
        require: true,
        trim: true,
        maxlength: 100,
        unique: 1
    },
    firstName: {
        type: String,
        require: true,
        trim: true
    },
    lastName: {
        type: String,
        require: true,
        trim: true
    },
    email: {
        type: String,
        require: true,
        trim: true,
        unique: 1
    },
    password: {
        type: String,
        require: true,
        minlength: 6
    },
    role: {
        type: Number,
        default: 2
    },
    token: {
        type: String,
        require: true
    }
})

//#### GENERATE TOKEN ALONG WITH MIDDLEWARE
userSchema.pre('save' , function(next) {

    //#### USER MODEL REFERENCE
    let user = this

    //#### GENERATE SALT
    if(user.isModified('password')){
        bcrypt.genSalt(SALT_I , function(err, salt) {
            if(err) return next(err)

            bcrypt.hash(user.password, salt, function(err, hash) {
                if(err) return next(err)
                
                user.password = hash
                next()            
            })

        })            
    } else {
        next()
    }
})


//#### GENERATE WEB TOKEN THROUGH JSON-WEB-TOKEN MODULE
userSchema.methods.generateToken = function(cb) {
    let user = this

    //#### CREATE TOKEN
    let token = jwt.sign(user._id.toHexString() , config.SECRET )

    //#### SET TOKE INTO USER SCHEMA
    user.token = token

    //#### SAVE AND UPDATE THE TOKEN AS WELL
    user.save((err, user) => {
        if(err) return cb(err)
        cb(null, user)
    })
}

//#### COMPARE PASSWORD DEFINITION
userSchema.methods.comparePassword = function(password , cb) {
    var user = this
    bcrypt.compare(password, user.password, function(err , isMatch) {
        if(err) return cb(err)
        cb(null, isMatch)
    })
}

//#### STATICS METHOD
userSchema.statics.findByToken = function(token , cb) {

    var user =  this

    jwt.verify(token, config.SECRET , (err, decode) => {

        User.findOne({'_id' : decode , token: token} , (err, user) => {

            if(err) return cb(err)
            cb(null, user)

        })

    })

}

//#### DELETE TOKEN
userSchema.methods.deleteToken = function(token , cb) {
    var user = this

    user.update({$unset: { token: 1}}, (err, user) => {
        if(err) return cb(err)
        
        cb(null, user)
    })
}

const User = mongoose.model('User' , userSchema)

module.exports = {
    User
}