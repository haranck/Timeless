const Category = require('../../models/categorySchema')


const categoryInfo = async (req, res) => {
   try {
      const page = parseInt(req.query.page) || 1;
      const limit = 4;
      const skip = (page - 1) * limit;

      const categoryData = await Category.find()
         .sort({ createdAt: 1 })
         .skip(skip)
         .limit(limit)

      const totalCategories = await Category.countDocuments();
      const totalPages = Math.ceil(totalCategories / limit);
      res.render('category', { cat: categoryData, totalPages: totalPages, currentPage: page, totalCategories: totalCategories });
   } catch (error) {
      console.log('error loading category page', error);
      res.redirect('/pageerror')
   }
}
const addCategory = async (req, res) => {
   const { name, description } = req.body

   try {
      const existingCategory = await Category.findOne({ name })
      if (existingCategory) {
         return res.status(400).json({ message: "Category already exists" })

      }

      const newCategory = new Category({ name, description })
      await newCategory.save()
      return res.status(201).json({ success: true, message: "Category created successfully" })
   } catch (error) {
      console.log('error adding category', error);
      throw new Error
      return res.status(500).json({ message: "Internal server error" })
   }
}

const toggleCategory = async (req, res) => {
   try {
      const { id } = req.params
      const category = await Category.findById(id)
      if (!category) {
         return res.status(404).json({ success: false, message: "Category not found" })
      }
      category.isListed = !category.isListed
      await category.save()
      return res.status(200).json({ success: true, message: "Category updated successfully" })
   } catch (error) {
      console.log('error toggling category', error);
      return res.status(500).json({ message: "Internal server error" })
   }
}
const getEditCategory = async (req, res) => {
   try {
      const id = req.query.id

      const category = await Category.findById({ _id: id });   

      res.render("edit-category", { category })
   } catch (error) {
      res.redirect('/pageerror')
   }
}

const editCategory = async (req, res) => {
   try {

      const id = req.params.id
      const { categoryName, description } = req.body
      const existingCategory = await Category.findOne({ name: categoryName })

      if (existingCategory) {
         return res.status(400).json({ error: "Category exists, please choose another one" })

      }
      const updateCategory = await Category.findByIdAndUpdate(id, {
         name: categoryName,
         description: description
      }, { new: true })

      if (updateCategory) {
         res.redirect('/admin/category')
      } else {
         res.status(404).json({ error: "category not found" })
      }

   } catch (error) {

      throw error
      res.status(500).json({ error: "internal server error" })
   }
}

module.exports = {
   categoryInfo,
   addCategory,
   toggleCategory,
   getEditCategory,
   editCategory
}