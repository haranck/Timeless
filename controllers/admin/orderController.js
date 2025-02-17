const product = require('../../models/productSchema')
const User = require("../../models/userSchema")
const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const Brand = require('../../models/brandSchema')
const Order = require('../../models/orderSchema')
const { default: mongoose } = require('mongoose')
const Wallet = require('../../models/walletSchema')
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const getOrdersPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = 5 
        const skip = (page - 1)*limit
        const count = await Order.countDocuments()
        const totalPages = Math.ceil(count/limit)

        const orders = await Order.find()
            .populate('user_id', 'name email mobile')
            .populate('order_items.productId', 'productName productImages price ')
            .sort({ createdAt: -1 }).skip(skip).limit(limit)
        

        // console.log(JSON.stringify(orders, null, 2));

        const returnRequests = orders.filter(order => order.status === 'Return requested');


        res.render('order-mgt', {
            orders,
            returnRequests,
            currentPage:page,
            totalPages
        })

    } catch (error) {
        res.status(500).json({ success: false, message: "internal server error" })
    }
}

const updateOrder = async (req, res) => {

    try {
        const { orderId, status } = req.body

        if (!orderId || !status) {
            return res.status(400).json({ success: false, message: "order ID and status are required" })
        }

        const updatedOrder = await Order.findByIdAndUpdate(orderId, { status }, { new: true })

        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: "order not found" })
        }

        await updatedOrder.save()

        res.status(200).json({ success: true, message: "order updated successfully" })

    } catch (error) {
        console.log("error updating order", error)
        res.status(500).json({ success: false, message: "internal server error" })
    }

}

const cancelOrder = async (req, res) => {

    try {
        const { orderId } = req.body
        if(!orderId){
            return res.status(404).json({ success: false, message: "order not found" })
        }
        await Order.findByIdAndUpdate(orderId, {status:'cancelled'})


        res.status(200).json({ success: true, message: "order deleted successfully" })

    } catch (error) {
        console.log("error deleting order", error)
        res.status(500).json({ success: false, message: "internal server error" })
    }

}

const approveReturn = async (req, res) => {
    try {
        const { orderId } = req.body
        if(!orderId){
            return res.status(404).json({ success: false, message: "order not found" })
        }
        const order = await Order.findByIdAndUpdate(orderId, {status:'Return approved'})

        const userId = order.user_id

        for (let item of order.order_items) {
            await Product.findByIdAndUpdate(item.productId, { $inc: { quantity: item.quantity } });
        }

        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({
                userId,
                balance: 0,
                transactions: []
            });
        }

        wallet.balance += order.total;
        wallet.transactions.push({
            type: 'credit',
            amount: order.total,
            description: `Refund for returned order`,
            status: 'completed'
        });

        await wallet.save();

        

        res.status(200).json({ success: true, message: "Return approved" })             
    } catch (error) {
        console.log("error approving return", error)
        res.status(500).json({ success: false, message: "internal server error" })
    }
}

const rejectReturn = async (req, res) => {
    try {
        const {reason} = req.body
        const orderId = req.params.orderId
        console.log("Rejecting return with reason:", reason);
        console.log("Order ID:", orderId);

        if(!orderId){
            return res.status(404).json({ success: false, message: "order not found" })
        }
        const order = await Order.findById(orderId)
        if(!order){
            return res.status(404).json({ success: false, message: "order not found" })
        }
        order.status = "Return rejected"
        order.adminReturnStatus =  reason

        await order.save()

        res.status(200).json({ success: true, message: "Return rejected" })         
    } catch (error) {
        console.log("error rejecting return", error)
        res.status(500).json({ success: false, message: "internal server error" })
    }
}

const getSalesReport = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = 10; 
        const skip = (page - 1) * limit; 

        const totalOrders = await Order.countDocuments({status: { $in: ["delivered", "Return rejected"] }})
        const totalSales =  await Order.find({ status: { $in: ["delivered", "Return rejected"] } }).select('total').then(orders => orders.reduce((sum, order) => sum + order.total, 0))
        const totalPages = Math.ceil(totalOrders / limit); 

        const orders = await Order.find({status: { $in: ["delivered", "Return rejected"] } })
            .populate('user_id', 'name email mobile')
            .populate('order_items.productId', 'productName price')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // const totalSales = orders.reduce((sum, order) => sum + order.total, 0);

        res.render('sales', { 
            orders, 
            totalSales, 
            totalOrders, 
            currentPage: page, 
            totalPages 
        });

    } catch (error) {
        console.log("Error getting sales report", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const getSalesReportPDF = async (req, res) => {
    try {
        const orders = await Order.find({status: { $in: ["delivered", "Return rejected"] } })
            .populate('user_id', 'name email mobile')
            .populate('order_items.productId', 'productName price')
            .sort({ createdAt: -1 });

        const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
        const totalOrders = orders.length;

        // Create a new PDF document
        const doc = new PDFDocument({
            margin: 50,
            size: 'A4'
        });
        const filePath = path.join(__dirname, '../publics/sales_report.pdf');
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Add company logo/name
        doc.fontSize(24)
           .font('Helvetica-Bold')
           .text('TIMELESS AURA', { align: 'center' })
           .moveDown(0.5);

        // Add report title
        doc.fontSize(16)
           .font('Helvetica')
           .text('Sales Report', { align: 'center' })
           .moveDown(0.5);

        // Add date
        doc.fontSize(10)
           .text(`Generated on: ${new Date().toLocaleDateString('en-US', {
               year: 'numeric',
               month: 'long',
               day: 'numeric'
           })}`, { align: 'center' })
           .moveDown(1);

        // Summary Section with box
        doc.rect(50, doc.y, 500, 60).stroke();
        doc.fontSize(12)
           .text('Summary', 60, doc.y + 10)
           .fontSize(10)
           .text(`Total Orders: ${totalOrders}`, 60, doc.y + 5)
           .text(`Total Sales: ₹${totalSales.toLocaleString()}.00`, 60, doc.y + 5)
           .moveDown(2);

        // Table Header with background
        const tableTop = doc.y;
        const tableHeaders = ['Order ID', 'Date', 'Customer Name', 'Status', 'Amount'];
        const columnWidths = [120, 80, 140, 80, 80];
        let xPosition = 50;

        // Draw header background
        doc.rect(50, tableTop, 500, 20).fill('#f0f0f0');

        // Draw header text
        doc.font('Helvetica-Bold').fontSize(10);
        tableHeaders.forEach((header, i) => {
            doc.fillColor('black')
               .text(header, xPosition, tableTop + 5, {
                   width: columnWidths[i],
                   align: header === 'Amount' ? 'right' : 'left'
               });
            xPosition += columnWidths[i];
        });

        // Table Data
        doc.font('Helvetica').fontSize(9);
        let yPosition = tableTop + 25;

        orders.forEach((order, index) => {
            // Add page if needed
            if (yPosition > 750) {
                doc.addPage();
                yPosition = 50;
                
                // Redraw headers on new page
                xPosition = 50;
                doc.rect(50, yPosition, 500, 20).fill('#f0f0f0');
                doc.font('Helvetica-Bold').fontSize(10);
                tableHeaders.forEach((header, i) => {
                    doc.fillColor('black')
                       .text(header, xPosition, yPosition + 5, {
                           width: columnWidths[i],
                           align: header === 'Amount' ? 'right' : 'left'
                       });
                    xPosition += columnWidths[i];
                });
                doc.font('Helvetica').fontSize(9);
                yPosition += 25;
            }

            // Draw alternating row background
            if (index % 2 === 0) {
                doc.rect(50, yPosition - 5, 500, 20).fill('#f9f9f9');
            }

            // Draw row data
            xPosition = 50;
            doc.fillColor('black')
               .text("#"+order._id.toString().slice(-20), xPosition, yPosition, {
                   width: columnWidths[0]
               });
            
            xPosition += columnWidths[0];
            doc.text(new Date(order.createdAt).toLocaleDateString(), xPosition, yPosition, {
                width: columnWidths[1]
            });
            
            xPosition += columnWidths[1];
            doc.text(order.user_id.name, xPosition, yPosition, {
                width: columnWidths[2]
            });
            
            xPosition += columnWidths[2];
            doc.text(order.status, xPosition, yPosition, {
                width: columnWidths[3]
            });
            
            xPosition += columnWidths[3];
            doc.text(`₹${order.total.toLocaleString()}.00`, xPosition, yPosition, {
                width: columnWidths[4],
                align: 'right'
            });

            yPosition += 20;
        });

        // Add footer
        doc.fontSize(8)
           .text('© 2024 TIMELESS AURA. All rights reserved.', 50, 780, { align: 'center' });

        // Finalize PDF and send response
        doc.end();

        stream.on('finish', () => {
            res.download(filePath, 'TIMELESS_AURA_sales_report.pdf', (err) => {
                if (err) {
                    console.error("Error downloading PDF:", err);
                    res.status(500).send("Error downloading PDF");
                }
                // Clean up: Delete the file after download
                fs.unlinkSync(filePath);
            });
        });

    } catch (error) {
        console.log("Error generating sales report PDF", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};


module.exports = {
    getOrdersPage,
    updateOrder,
    cancelOrder,
    approveReturn,
    cancelOrder,
    approveReturn,
    rejectReturn,
    getSalesReport,
    getSalesReportPDF
}

