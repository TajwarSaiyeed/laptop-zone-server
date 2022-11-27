const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

const uri = process.env.DB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ error: 401, message: "Unauthorized Access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).send({ error: 403, message: "Forbidded Access" });
    }
    req.decoded = decoded;
    next();
  });
};

const run = async () => {
  try {
    const usersCollection = client.db("laptopZone").collection("users");
    const blogsCollection = client.db("laptopZone").collection("blogs");
    const categoryCollection = client.db("laptopZone").collection("category");
    const productsCollection = client.db("laptopZone").collection("products");
    const ordersCollection = client.db("laptopZone").collection("orders");

    // put a order
    app.put("/orders", verifyJWT, async (req, res) => {
      const id = req.query.id;
      const order = req.body;
      const filter = { bookId: id };
      const options = { upsert: true };
      const updatedDoc = {
        $set: order,
      };
      const result = await ordersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );

      const query = { _id: ObjectId(id) };
      const updateProductsDoc = {
        $set: {
          isBooked: true,
        },
      };

      const updateProducts = await productsCollection.updateOne(
        query,
        updateProductsDoc,
        options
      );
      res.send(result);
    });

    // check the product id with bookid in ordesCollection
    app.get("/checkOrders", verifyJWT, async (req, res) => {
      const id = req.query.id;
      const query = { bookId: id };
      const result = await ordersCollection.findOne(query);
      if (!result) {
        return res.send({ isBooked: false });
      }
      res.send({ isBooked: true });
    });

    // get all order for specific email
    app.get("/orders", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (decodedEmail !== email) {
        return res
          .status(403)
          .send({ error: 403, message: "Forbidden Access" });
      }
      const query = { email: email };
      const result = await ordersCollection.find(query).toArray();
      res.send(result);
    });

    // add/post a product
    app.post("/products", verifyJWT, async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });

    // report product
    app.put("/products", async (req, res) => {
      const id = req.query.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          reported: true,
        },
      };
      const result = await productsCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // get reported items
    app.get("/reportedProducts", verifyJWT, async (req, res) => {
      const query = { reported: true };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    // reported item delete
    app.delete("/reportedProducts", verifyJWT, async (req, res) => {
      const id = req.query.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    // get all product by categroy
    app.get("/category/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { categoryId: id };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    // get product by email for specific seller
    app.get("/products", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const query = { sellerEmail: email };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    // get all blogs
    app.get("/blogs", async (req, res) => {
      const query = {};
      const result = await blogsCollection.find(query).toArray();
      res.send(result);
    });

    // get all category
    app.get("/category", async (req, res) => {
      const query = {};
      const result = await categoryCollection.find(query).toArray();
      res.send(result);
    });

    // verify user
    app.put("/users", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          verified: true,
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      const filterSeller = { sellerEmail: email };

      const updateVerifyDoc = {
        $set: {
          isVerified: true,
        },
      };

      const isverified = await productsCollection.updateMany(
        filterSeller,
        updateVerifyDoc,
        options
      );
      res.send(result);
    });

    // jwt
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "1d",
        });
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: "" });
    });

    // create user to the database
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // get all sellers for admin
    app.get("/users", verifyJWT, async (req, res) => {
      const query = {};
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });

    // delete a user by admin
    app.delete("/users/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // check admin
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });
    // check seller
    app.get("/users/seller/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send({ isSeller: user?.role === "seller" });
    });
    // check seller
    app.get("/sellerVerify/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send({ isVerified: user?.verified === true });
    });
    // check buyer
    app.get("/users/buyer/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send({ isBuyer: user?.role === "buyer" });
    });
  } finally {
  }
};
run().catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, () => {
  console.log(`Server : ${port}`);
});
