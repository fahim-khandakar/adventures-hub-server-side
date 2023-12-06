const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(express.json());
app.use(
  cors({
    origin: ["https://adventures-hub.web.app"], // http://localhost:5173
    credentials: true,
  })
);

app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.p0m1q4c.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// middlewares
const logger = async (req, res, next) => {
  console.log("called:", req.host, req.originalUrl);
  next();
};

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  console.log("value of token:", token);
  if (!token) {
    return res.status(401).send({ message: "Not Authorized" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    //error
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "Unauthorized" });
    }
    console.log("value of token:", decoded);

    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const serviceCollections = client.db("serviceDB").collection("services");
    const bookingCollections = client.db("serviceDB").collection("bookings");

    // auth related api
    app.post("/jwt", logger, async (req, res) => {
      res.setHeader(
        "Access-Control-Allow-Origin",
        "https://adventures-hub.web.app"
      );
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production" ? true : false,
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      res
        .clearCookie("token", {
          maxAge: 0,
          secure: process.env.NODE_ENV === "production" ? true : false,
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    // services post
    app.post("/services", async (req, res) => {
      const newService = req.body;
      const result = await serviceCollections.insertOne(newService);
      res.send(result);
    });

    app.get("/relatedService", logger, verifyToken, async (req, res) => {
      const queryObj = {};
      const query = req.query.serviceName;
      if (query) {
        queryObj.serviceName = query;
      }
      const result = await serviceCollections.find(queryObj).toArray();
      res.send(result);
    });

    app.get("/serviceDetails/:id", logger, verifyToken, async (req, res) => {
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

    app.get("/myServices", logger, verifyToken, async (req, res) => {
      const queryObj = {};
      const myServices = req.query.email;
      console.log("myService", myServices);
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

    app.put("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const options = { upsert: true };
      const updateBooking = req.body;
      const service = {
        $set: {
          status: updateBooking.status,
        },
      };
      const result = await bookingCollections.updateOne(
        query,
        service,
        options
      );
      console.log(id, updateBooking);
      res.send(result);
    });

    app.get("/myBookings", logger, verifyToken, async (req, res) => {
      const queryObj = {};
      const myBookings = req.query.email;
      if (myBookings) {
        queryObj.clientEmail = myBookings;
      }
      const result = await bookingCollections.find(queryObj).toArray();
      res.send(result);
    });

    app.get("/myPending", logger, verifyToken, async (req, res) => {
      const queryEmail = req.query.email;
      const allPending = await bookingCollections
        .find({ clientEmail: { $ne: queryEmail }, email: queryEmail })
        .toArray();

      res.send(allPending);
    });

    // app.get("/myPending", async (req, res) => {
    //   const queryObj = req.query.email;
    //   const allPending = await bookingCollections.find().toArray();
    //   const arr = [];

    //   if (allPending.length > 0) {
    //     const result = allPending.filter(
    //       (item) => item.clientEmail !== queryObj
    //     );
    //     arr.push(...result); // Push the filtered data into the arr array
    //   }

    //   res.send(arr);
    // });

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
