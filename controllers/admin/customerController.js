const User = require("../../models/userSchema")



const customerInfo = async (req, res) => {
   try {

      let search = ""
      if (req.query.search) {
         search = req.query.search; //backendil llath access  cheyth serchik vekknnu

      }
      let page = 1
      if (req.query.page) {
         page = req.query.page
      }

      const limit = 5
      const userData = await User.find({
         isAdmin: false,
         $or: [

            { name: { $regex: ".*" + search + ".*" } },
            { email: { $regex: ".*" + search + ".*" } },

         ]

      })
         .limit(limit * 1)
         .skip((page - 1) * limit)
         .exec()   // chain of promise combine cheyunnu

      const count = await User.find({
         isAdmin: false,
         $or: [

            { name: { $regex: ".*" + search + ".*" } },
            { email: { $regex: ".*" + search + ".*" } },

         ]
      }).countDocuments()

      const totalPages = Math.ceil(count / limit);

      res.render("customers", {
         data: userData,
         totalPages: totalPages,
         currentPage: page,
         search: search
      });

   } catch (error) {
      console.error('Error in customerInfo:', error);
      res.redirect('/pageerror');
   }
}

const customerBlocked = async (req, res) => {
   try {
      let id = req.query.id
      await User.updateOne({ _id: id }, { $set: { isblocked: true } })
      res.redirect('/admin/customers')
   } catch (error) {
      res.redirect('/pageerror')
   }
}

const customerunBlocked = async (req, res) => {
   try {
      let id = req.query.id
      await User.updateOne({ _id: id }, { $set: { isblocked: false } })
      res.redirect("/admin/customers")
   } catch (error) {
      res.redirect("/pageerror")
   }
}

module.exports = {
   customerInfo,
   customerBlocked,
   customerunBlocked
}