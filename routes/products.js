const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const Firestore = require('firebase-admin').firestore;
const multer = require('multer');

const FILE_TYPE_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg',
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const isValid = FILE_TYPE_MAP[file.mimetype];
        let uploadError = new Error('Invalid Image Type');
        if (isValid) {
            uploadError = null
        }
        cb(uploadError, 'public/uploads')
    },
    filename: function (req, file, cb) {
        const fileName = file.originalname.split('').join('-');
        const extension = FILE_TYPE_MAP[file.mimetype];
        cb(null, `${fileName}-${Date.now()}.${extension}`)
    }
})

const upload = multer({ storage: storage })


const Database = admin.firestore();
const ProductCollection = Database.collection('products');
const CategoryCollection = Database.collection('categories');

router.get('/', async (req, res) => {

    const productList = await ProductCollection.get();
    const products = [];
    productList.forEach((doc) => {
        products.push({
            id: doc.id,
            data: doc.data()
        })
    })
    res.status(200).send(products);
})

router.get('/:id', async (req, res) => {
    const product = await ProductCollection.doc(req.params.id).get();
    if (!product) {
        res.status(500), json({ success: false })
    }
    res.status(200).send(product);
}
)

router.post('/', upload.single('image'), async (req, res) => {
    // create product
    const newProductData = {
        name: req.body.name,
        description: req.body.description,
        richDescription: req.body.richDescription,
        image: req.body.image,
        brand: req.body.brand,
        price: req.body.price,
        category: req.body.category,
        countInStock: req.body.countInStock,
        rating: req.body.rating,
        numReviews: req.body.numReviews,
        isFeatured: req.body.isFeatured
    };
    
    // add data to Firestore
    const newProductRef = await ProductCollection.add(newProductData);
    
    // retrieve the added document
    const newProductDoc = await newProductRef.get();
    const newProduct = {
        id: newProductDoc.id,
        data: newProductDoc.data()
    };
    
    res.send(newProduct);

})

router.put('/:id', async (req, res) => {

    const updatedProductData = {
        name: req.body.name,
        description: req.body.description,
        richDescription: req.body.richDescription,
        image: req.body.image,
        brand: req.body.brand,
        price: req.body.price,
        category: req.body.category,
        countInStock: req.body.countInStock,
        rating: req.body.rating,
        numReviews: req.body.numReviews,
        isFeatured: req.body.isFeatured
    };

    const product = await ProductCollection.doc(req.params.id).update(updatedProductData);
    if (!product) {
        res.status(500), json({ success: false })
    }
    res.status(200).send(product);
})

router.delete('/:id', (req, res) => {
    ProductCollection.doc(req.params.id).delete().then(product => {
        if (product) {
            return res.status(200).json({ success: true, message: 'Product deleted successfully' })
        } else {
            return res.status(404).json({ success: false, message: 'Product cannot find' })
        }
    }).catch(err => {
        return res.status(400).json({ success: false, error: err })
    })
})

router.get('/get/count', async (req, res) => {
    const productCount = await ProductCollection.get();
    res.status(200).json({ productCount: productCount.size });
});


router.get('/get/featured/:count', async (req, res) => {
    const count = req.params.count ? req.params.count : 0;
    const featuredProducts = await ProductCollection.where('isFeatured', '==', true).limit(count).get();
    const products = [];
    featuredProducts.forEach((doc) => {
        products.push({
            id: doc.id,
            data: doc.data()
        })
    })
    res.status(200).send(products);
})

router.put('/gallery-images/:id', upload.array('images', 10), async (req, res) => {
    const files = req.files;
    let imagesPaths = [];
    const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;
    if (files) {
        files.map((file) => {
            imagesPaths.push(`${basePath}${file.filename}`);
        })
    }
    const product = await ProductCollection.doc(req.params.id).update({ images: imagesPaths });
    if (!product) {
        res.status(500), json({ success: false })
    }
    res.status(200).send(product);
})

module.exports = router;