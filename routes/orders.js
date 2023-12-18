const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

const Database = admin.firestore();
const OrderCollection = Database.collection('orders');
const OrderItemCollection = Database.collection('orderItems');

router.get('/', async (req, res) => {
    try {
        const orderListSnapshot = await OrderCollection.orderBy('dateOrdered', 'desc').get();

        const orderList = orderListSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.send(orderList);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const orderSnapshot = await OrderCollection.doc(req.params.id).get();

        if (!orderSnapshot.exists) {
            res.status(404).json({ success: false, message: 'Order not found' });
            return;
        }

        const order = {
            id: orderSnapshot.id,
            ...orderSnapshot.data()
        };

        res.send(order);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
});

router.post('/', async (req, res) => {
    try {
        const orderItems = req.body.orderItems;

        const orderItemsRefs = await Promise.all(orderItems.map(async (orderItem) => {
            const newOrderItemRef = await OrderItemCollection.add(orderItem);
            return newOrderItemRef;
        }));

        const orderItemsIds = orderItemsRefs.map(ref => ref.id);

        const totalPrice = await calculateTotalPrice(orderItems);


        const newOrderData = {
            orderItems: orderItemsIds,
            shippingAddress1: req.body.shippingAddress1,
            shippingAddress2: req.body.shippingAddress2,
            city: req.body.city,
            zip: req.body.zip,
            country: req.body.country,
            phone: req.body.phone,
            status: req.body.status,
            totalPrice: totalPrice,
            user: req.body.user,
            dateOrdered: new Date(),
        };

        const newOrderRef = await OrderCollection.add(newOrderData);
        const newOrderSnapshot = await newOrderRef.get();
        const newOrder = {
            id: newOrderSnapshot.id,
            ...newOrderSnapshot.data()
        };

        res.send(newOrder);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const orderId = req.params.id;
        const orderDataToUpdate = {
            status: req.body.status,
        };

        await OrderCollection.doc(orderId).update(orderDataToUpdate);

        const updatedOrderSnapshot = await OrderCollection.doc(orderId).get();
        const updatedOrder = {
            id: updatedOrderSnapshot.id,
            ...updatedOrderSnapshot.data()
        };

        res.send(updatedOrder);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const orderId = req.params.id;

        await OrderCollection.doc(orderId).delete();

        res.status(200).json({ success: true, message: 'Order deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
});

async function calculateTotalPrice(orderItems) {
    try {
        const totalPrices = await Promise.all(orderItems.map(async (orderItem) => {
            const productSnapshot = await admin.firestore().doc(`products/${orderItem.product}`).get();
            const productData = productSnapshot.data();
            const totalPrice = productData.price * orderItem.quantity;
            return totalPrice;
        }));

        return totalPrices.reduce((a, b) => a + b, 0);
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports = router;
