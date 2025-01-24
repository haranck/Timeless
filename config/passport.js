const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userSchema');
const env = require('dotenv').config()

passport.use(new GoogleStrategy({
   clientID:process.env.GOOGLE_CLIENT_ID,
   clientSecret:process.env.GOOGLE_CLIENT_SECRET,
   callbackURL:process.env.GOOGLE_REDIRECT_URI, // Ensure this matches
},

async (accessToken, refreshToken, profile, done) => {
   try {
      let user = await User.findOne({googleId:profile.id})
      if(user){
         return done(null,user)
      }else{
         user = new User({
            name:profile.displayName,
            email:profile.emails[0].value,
            googleId:profile.id
         })
         await user.save();
         return done(null,user) 
      }

   } catch (error) {
      return done(error,null)
   }
}

))

passport.serializeUser((user,done)=>{  // serialize cheyunnath  user details sessionilek assign cheyyan
   done(null,user.id)
})

passport.deserializeUser((id,done)=>{  // deserialize cheyunnath sessionilek assign cheyyan user details allel sessionil ninn edukkan
   User.findById(id)
   .then(user=>{
      done(null,user)
   })
   .catch(err=>{
      done(err,null)
   })
})

module.exports = passport;