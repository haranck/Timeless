const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const env = require('dotenv').config()
const db = require('./config/db');
const nocache = require('nocache')
db()


// const csrf = require('csurf');
const userRouter = require('./routes/userRouter');
const passport = require("./config/passport");
const adminRouter = require('./routes/adminRouter')

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: true,
      cookie: {
            secure: false,
            maxAge: 1000 * 60 * 60 * 24 * 7,
            httpOnly: true
      }
}))
app.use(nocache())
app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");
app.set("views", [
      path.join(__dirname, "views/user"),
      path.join(__dirname, "views/admin"),
]);
app.use(express.static(path.join(__dirname, "public")));



app.use('/admin', adminRouter)
app.use('/', userRouter)

app.use("/error", (req, res, next) => {
      throw new Error("Intentional error triggered on /error route");
})


app.use('*', (req, res) => {
      res.status(404).render('error', {
            title: 'Oops!',
            message: 'The page you\'re looking for doesn\'t exist.'
      });
})

app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).render('error', {
            title: 'Oops!',
            message: err.message || 'Something went wrong!'
      });
});
app.listen(process.env.PORT, () => {
      console.log('Server is running on port 3000')
      
})


