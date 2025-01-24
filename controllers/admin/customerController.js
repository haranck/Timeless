const User = require("../../models/userSchema");

const customerInfo = async (req, res) => {
    try {
        let search = "";
        if (req.query.search) {
            search = req.query.search; // Accessing search input from query
        }

        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page); // Parse the page as an integer
        }

        const limit = 5;
        const userData = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } }
            ]
        })
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();

        const count = await User.countDocuments({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } }
            ]
        });

        const totalPages = Math.ceil(count / limit);

        res.render("customers", {
            data: userData,
            totalPages: totalPages,
            currentPage: page,
            search: search
        });
    } catch (error) {
        console.error(error);
        res.redirect("/pageerror");
    }
};

const customerBlocked = async (req, res) => {
    try {
        let id = req.query.id;
        await User.updateOne({ _id: id }, { $set: { isblocked: true } });
        res.redirect("/admin/customers");
    } catch (error) {
        res.redirect("/pageerror");
    }
};

const customerunBlocked = async (req, res) => {
    try {
        let id = req.query.id;
        await User.updateOne({ _id: id }, { $set: { isblocked: false } });
        res.redirect("/admin/customers");
    } catch (error) {
        res.redirect("/pageerror");
    }
};

module.exports = {
    customerInfo,
    customerBlocked,
    customerunBlocked
};
