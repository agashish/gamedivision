const express = require('express')
const hbs = require('express-handlebars')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const moment = require('moment')
const bcrypt = require('bcrypt')
const mongoose = require('mongoose')
const config = require('./config/config').get(process.env.NODE_ENV)
const app = express()
const abc = 'test'     
//########### HBS SETUP #############
app.engine('hbs', hbs({
    extname: 'hbs',
    defaultLayout: 'main',
    layoutsDir: __dirname + './../views/layout',
    partialsDir: __dirname + './../views/partials'
}))
   
app.set('view engine' ,'hbs')

//##### MIDDLEWARE
app.use('/css' , express.static(__dirname + './../public/css'))
app.use('/js' , express.static(__dirname + './../public/js'))

//####### Content MIDDLEWARE
app.use(bodyParser.json())

//####### COOKIE PARSER
app.use(cookieParser())

//####### AUTH MIDDLEWARE
const {auth} = require('./middleware/auth')

//###### MONGOOSE CONNECTION
mongoose.Promise = global.Promise
mongoose.connect(config.DATABASE)

//###### MODELS
const {User} = require('./models/user')
const {Article} = require('./models/article')
const {UserReview} = require('./models/user_review')

//###### GET ROUTE
app.get('/' , (req, res) => {

    Article.find().sort({_id:'asc'}).limit(10).exec((err, articles) => {
        if(err) return res.status(400).send(err)

        res.render('home' , {
            articles
        })
    })    
})

app.get('/register' , auth , (req, res) => {
    if(req.user) return res.redirect('/dashboard')    
    res.render('register')
})

app.get('/login' , auth , (req, res) => {

    if(req.user) return res.redirect('/dashboard')
    res.render('login')
})


app.get('/dashboard' , auth , (req, res) => {   
    if(!req.user) return res.redirect('/login')
    res.render('dashboard', {
        dashboard: true,
        isAdmin: req.user.role === 1 ? true : false
    })
})

app.get('/dashboard/articles' , auth , (req, res) => {

    if(!req.user) return res.redirect('/login')
    res.render('admin_articles' , {
        dashboard: true,
        isAdmin: req.user.role === 1 ? true : false
    })

})

app.get('/games/:id' , auth, (req, res) => {
    
    let addReview = req.user ? true : false
    Article.findById({_id: req.params.id} , (err , article) => {
        if(err) return res.status(400).send(err)

        UserReview.find({'postId': req.params.id}).exec((err, userReview) => {
            res.render('article' , {
                date: moment(article.createdAt).format('MM/DD/YY'),
                article,
                review: addReview,
                userReview
            })                
        })                   
    })
})

app.get('/dashboard/reviews', auth, (req, res) => {

    if(!req.user) return res.redirect('/login')

    UserReview.find({'ownerId': req.user._id}).exec((err, userReview) => {
        if(err) return res.status(400).send(err)

        res.render('dashboard_reviews', {
            dashboard: false,
            isAdmin: req.user.role === 1 ? true : false,
            userReview 
        })
    })
    
})

//######## POST ROUTES
app.post('/api/register' , (req, res) => {
   
    const user = new User({
        username: req.body.username,
        firstName: req.body.firstname,
        lastName: req.body.lastname,
        email: req.body.email,
        password: req.body.password
    })
   
    //save user into user model / document into mongoose
    user.save((err, doc) => { 
        if(err) return res.status(400).send(err)

        //#### GENERATE TOKEN FOR WEB
        user.generateToken((err, user) => {
            if(err) return res.status(400).send(err)
            
            //#### SET THE TOKEN INTO HEADER
            //res.header('x-token' , user.token).send('Token Updated')
            
            //#### SET THE TOKEN INTO COOKIE FOR LONG TIME AND GET AFTER REFERESHES
            res.cookie('auth' , user.token).send('ok')           

        })
    })
})

app.post('/api/login' , (req, res) => {
    
    //##### FIND USER IF EXISTS
    User.findOne({'email':req.body.email},(err, user) => {
        if(!user) {
            return res.status(400).json({message: 'Auth failes. User not found in our database.'})           
        }

        //#### COMPARE THE PASSWORD
        user.comparePassword(req.body.password , (err, isMatch) => {
            if(err) return res.status(400).send(err)

            if(!isMatch){
                return res.status(400).json({message: 'Password not matching' , status: isMatch})
            }
            
            //#### GENERATE THE COOKIE AGAIN AFTER SUCCESS
            user.generateToken((err, user) => {
                if(err){
                    return res.status(400).send(err)
                }

                //#### SET THE TOKEN INTO COOKIE AGAIN
                //res.cookie('auth' , user.token).json({message: 'done'})
                res.cookie('auth' , user.token).status(200).send('login done')

            })

        })

    })

})

//##### ADD ARTCLE BY ADMIN ROLE TYPE
app.post('/api/add_article' , auth , (req, res) => {

    if(!req.user) return res.redirect('/login')

    const article = new Article({
        title: req.body.title,
        ownerUsername: req.user.username,
        review: req.body.review,
        rating: req.body.rating,
        ownerId: req.user._id
    })

    article.save((err, article) => {
        if(err) return res.status(400).send(err)
        res.status(200).send()
    })
})

//#### ADD USER REVIEW ON ARTICLE
app.post('/api/add_review' , auth , (req, res) => {
   
    const userReview = new UserReview({
        review: req.body.review,
        rating: req.body.rating,
        postId: req.body.postId,
        ownerId: req.user._id,
        ownerUsername: req.user.username,
        titlePost: req.body.titlePost
    })

    userReview.save((err, userReview) => {
        if(err) return res.status(400).send(err)
        res.status(200).send()  
    })
})

//#### LOGOUT
app.get('/dashboard/logout' , auth , (req, res) => {
    if(!req.user) return res.redirect('/login')

    req.user.deleteToken(req.token, (err, user) => {
        if(err) return res.status(400).send(err)

        res.cookie('auth', '')
        res.redirect('/')
    })
})

app.listen(config.PORT, () => {
    console.log(`Start server port at ${config.PORT}`)
})
