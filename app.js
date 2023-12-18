const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const admin = require('firebase-admin');
const cors = require('cors');

var serviceAccount = require("./helpers/madproject-dfff5-firebase-adminsdk-faee9-473c8552e2.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(express.json()); // Add this line to parse JSON bodies


require('dotenv/config');

const authJwt = require('./helpers/jwt');
const errorHandler = require('./helpers/error-handler');

app.use(cors());
app.options('*', cors());


const api = process.env.API_URL;
const categoriesRoute = require('./routes/categories');
const productRoute = require('./routes/products');
const userRoute = require('./routes/users');
const orderRoute = require('./routes/orders');

app.use(`${api}/products`, productRoute);
app.use(`${api}/categories`, categoriesRoute);
app.use(`${api}/users`, userRoute);
app.use(`${api}/orders`, orderRoute);

// Check Firebase connection
app.get(`${api}/checkFirebaseConnection`, (req, res) => {
  try {
    // Attempt to get a list of users from Firebase
    admin.auth().listUsers(1)
      .then(() => {
        res.status(200).json({ success: true, message: 'Firebase connection is successful' });
      })
      .catch(error => {
        console.error('Firebase connection failed:', error);
        res.status(500).json({ success: false, message: 'Firebase connection failed' });
      });
  } catch (error) {
    console.error('Error checking Firebase connection:', error);
    res.status(500).json({ success: false, message: 'Error checking Firebase connection' });
  }
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
