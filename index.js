const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.p0m1q4c.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollections = client.db("serviceDB").collection("services");
    const bookingCollections = client.db("serviceDB").collection("bookings");

    // services post
    app.post("/services", async (req, res) => {
      const newService = req.body;
      const result = await serviceCollections.insertOne(newService);
      res.send(result);
    });

    app.get("/serviceDetails/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await serviceCollections.findOne(query);
      console.log(result);
      res.send(result);
    });

    app.get("/services", async (req, res) => {
      let queryObj = {};
      let sortObj = {};
      const category = req.query.serviceName;
      const sortOrder = req.query.sortOrder;
      const sortField = req.query.sortField;
      if (category) {
        queryObj.serviceName = category;
      }

      if (sortObj && sortOrder) {
        sortObj[sortField] = sortOrder;
      }

      const cursor = serviceCollections.find(queryObj).sort(sortObj);
      const result = await cursor.toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Adventures Hub server is running");
});

app.listen(port, (req, res) => {
  console.log(port);
});
