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
      res.send(result);
    });

    app.put("/updateService/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateService = req.body;
      const service = {
        $set: {
          servicePhoto: updateService.servicePhoto,
          serviceName: updateService.serviceName,
          price: updateService.price,
          serviceArea: updateService.serviceArea,
          description: updateService.description,
        },
      };
      const result = await serviceCollections.updateOne(
        query,
        service,
        options
      );
      res.send(result);
      console.log(id);
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

    app.delete("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await serviceCollections.deleteOne(query);
      res.send(result);
    });

    app.get("/myServices", async (req, res) => {
      const queryObj = {};
      const myServices = req.query.email;
      if (myServices) {
        queryObj.email = myServices;
      }
      const result = await serviceCollections.find(queryObj).toArray();
      res.send(result);
    });

    // booking area
    app.post("/bookings", async (req, res) => {
      const newBooking = req.body;
      const result = await bookingCollections.insertOne(newBooking);
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
