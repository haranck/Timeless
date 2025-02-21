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
const { getDiscountPrice } = require("../../helpers/offerHelper");

const getOrdersPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = 5
        const skip = (page - 1) * limit
        const count = await Order.countDocuments()
        const totalPages = Math.ceil(count / limit)

        const orders = await Order.find({ status: { $nin: ["failed"] } })
            .populate('user_id', 'name email mobile')
            .populate('order_items.productId', 'productName productImages price ')
            .sort({ createdAt: -1 }).skip(skip).limit(limit)

        const returnRequests = orders.filter(order => order.status === 'Return requested');

        res.render('order-mgt', {
            orders,
            returnRequests,
            currentPage: page,
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

        res.status(200).json({ success: true, message: "order updated successfully", status: updatedOrder.status })

    } catch (error) {
        console.log("error updating order", error)
        res.status(500).json({ success: false, message: "internal server error" })
    }
}

const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.body
        if (!orderId) {
            return res.status(404).json({ success: false, message: "order not found" })
        }
        await Order.findByIdAndUpdate(orderId, { status: 'cancelled' })


        res.status(200).json({ success: true, message: "order deleted successfully" })

    } catch (error) {
        console.log("error deleting order", error)
        res.status(500).json({ success: false, message: "internal server error" })
    }
}

const approveReturn = async (req, res) => {
    try {
        const { orderId } = req.body
        if (!orderId) {
            return res.status(404).json({ success: false, message: "order not found" })
        }
        const order = await Order.findByIdAndUpdate(orderId, { status: 'Return approved' })

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
        const { reason } = req.body
        const orderId = req.params.orderId
        console.log("Rejecting return with reason:", reason);
        console.log("Order ID:", orderId);

        if (!orderId) {
            return res.status(404).json({ success: false, message: "order not found" })
        }
        const order = await Order.findById(orderId)
        if (!order) {
            return res.status(404).json({ success: false, message: "order not found" })
        }
        order.status = "Return rejected"
        order.adminReturnStatus = reason

        await order.save()

        res.status(200).json({ success: true, message: "Return rejected" })
    } catch (error) {
        console.log("error rejecting return", error)
        res.status(500).json({ success: false, message: "internal server error" })
    }
}

const getDateRange = (filterType, fromDate, toDate) => {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    if (fromDate && toDate) {
        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);

        return { start, end };
    }

    switch (filterType) {
        case 'Daily':
            return { start: startOfDay, end: endOfDay };

        case 'Weekly':
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            return { start: startOfWeek, end: endOfDay };

        case 'Monthly':
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            startOfMonth.setHours(0, 0, 0, 0);
            return { start: startOfMonth, end: endOfDay };

        case 'Yearly':
            const startOfYear = new Date(today.getFullYear(), 0, 1);
            startOfYear.setHours(0, 0, 0, 0);
            return { start: startOfYear, end: endOfDay };

        default:
            return { start: new Date(0), end: endOfDay };
    }
};

const getSalesReport = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const filterType = req.query.filterType || 'All';
        const fromDate = req.query.fromDate;
        const toDate = req.query.toDate;

        const dateRange = getDateRange(filterType, fromDate, toDate);

        const query = {
            status: { $in: ["delivered", "Return rejected"] },
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
        };

        const totalOrders = await Order.countDocuments(query);

        const totalSales = await Order.find(query)
            .select('total')
            .then(orders => orders.reduce((sum, order) => sum + order.total, 0));

        const totalPages = Math.ceil(totalOrders / limit);

        const orders = await Order.find(query)
            .populate('user_id', 'name email mobile')
            .populate('order_items.productId', 'productName price')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.render('sales', {
            orders,
            totalSales,
            totalOrders,
            currentPage: page,
            totalPages,
            filterType,
            fromDate,
            toDate
        });

    } catch (error) {
        console.log("Error getting sales report", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const getSalesReportPDF = async (req, res) => {
    try {
        const filterType = req.query.filterType || 'All';
        const fromDate = req.query.fromDate;
        const toDate = req.query.toDate;

        const dateRange = getDateRange(filterType, fromDate, toDate);

        const query = {
            status: { $in: ["delivered", "Return rejected"] },
            createdAt: { $gte: dateRange.start, $lte: dateRange.end }
        };

        const orders = await Order.find(query)
            .populate('user_id', 'name email mobile')
            .populate('order_items.productId', 'productName price')
            .sort({ createdAt: -1 });

        const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
        const totalOrders = orders.length;

        const doc = new PDFDocument({
            margin: 50,
            size: 'A4'
        });
        const filePath = path.join(__dirname, '../publics/sales_report.pdf');
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        doc.fontSize(24)
            .font('Helvetica-Bold')
            .text('TIMELESS AURA', { align: 'center' })
            .moveDown(0.5);

        doc.fontSize(16)
            .font('Helvetica')
            .text(`Sales Report - ${filterType}`, { align: 'center' })
            .moveDown(0.5);

        if (fromDate && toDate) {
            doc.fontSize(10)
                .text(`Date Range: ${new Date(fromDate).toLocaleDateString()} to ${new Date(toDate).toLocaleDateString()}`, { align: 'center' })
                .moveDown(0.5);
        } else if (filterType !== 'All') {
            doc.fontSize(10)
                .text(`Filter: ${filterType}`, { align: 'center' })
                .moveDown(0.5);
        }

        doc.fontSize(10)
            .text(`Generated on: ${new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}`, { align: 'center' })
            .moveDown(1);

        doc.rect(50, doc.y, 500, 60).stroke();
        doc.fontSize(12)
            .text('Summary', 60, doc.y + 10)
            .fontSize(10)
            .text(`Total Orders: ${totalOrders}`, 60, doc.y + 5)
            .text(`Total Sales: ₹${totalSales.toLocaleString()}.00`, 60, doc.y + 5)
            .moveDown(2);

        const tableTop = doc.y;
        const tableHeaders = ['Order ID', 'Date', 'Customer Name', 'Status', 'Amount'];
        const columnWidths = [120, 80, 140, 80, 80];
        let xPosition = 50;

        doc.rect(50, tableTop, 500, 20).fill('#f0f0f0');

        doc.font('Helvetica-Bold').fontSize(10);
        tableHeaders.forEach((header, i) => {
            doc.fillColor('black')
                .text(header, xPosition, tableTop + 5, {
                    width: columnWidths[i],
                    align: header === 'Amount' ? 'right' : 'left'
                });
            xPosition += columnWidths[i];
        });

        doc.font('Helvetica').fontSize(9);
        let yPosition = tableTop + 25;

        orders.forEach((order, index) => {
            if (yPosition > 750) {
                doc.addPage();
                yPosition = 50;

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

            if (index % 2 === 0) {
                doc.rect(50, yPosition - 5, 500, 20).fill('#f9f9f9');
            }

            xPosition = 50;
            doc.fillColor('black')
                .text("#" + order._id.toString().slice(-20), xPosition, yPosition, {
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

        doc.fontSize(8)
            .text('© 2024 TIMELESS AURA. All rights reserved.', 50, 780, { align: 'center' });

        doc.end();

        stream.on('finish', () => {
            res.download(filePath, 'TIMELESS_AURA_sales_report.pdf', (err) => {
                if (err) {
                    console.error("Error downloading PDF:", err);
                    res.status(500).send("Error downloading PDF");
                }
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
    rejectReturn,
    getSalesReport,
    getSalesReportPDF
}