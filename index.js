const express = require('express');
const cors = require('cors');
require('dotenv').config();
const stripe = require('stripe')(process.env.PAYMENT_KEY)
const app = express();
var jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());
// app.use(cookieParser())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.quedl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const tagesCullection = client.db("Postify").collection("tages");
        const AnnouncementCullection = client.db("Postify").collection("Announcement");
        const bageCullection = client.db("Postify").collection("bage");
        const addpostCullection = client.db("Postify").collection("addpost");
        const comentsCullection = client.db("Postify").collection("coments");
        const feedbackCullection = client.db("Postify").collection("feedback");
        const mackAdminCullection = client.db("Postify").collection("mackAdmin");



        // jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '365d' })
            res.send({ token })
        })

        // meddelwar
        const verifiToken = (req, res, next) => {
            // console.log('inside verify token', req.headers.authorization);
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).send({ massage: 'unauthorize access' })
            }
            const token = authHeader.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
                if (err) {
                    return res.send(401).send({ massage: 'forbiddan access' })
                }
                req.decoded = decoded;
                next()
            })
        }

        const verifiAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            // console.log('vairfy admin 91:', query);
            const user = await bageCullection.findOne(query)
            const isAdmin = user?.role === "admin";
            if (!isAdmin) {
                return res.status(403).send({ massage: 'forbidden access' })
            }
            next()
        }

        // admin 
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params?.email;
            // console.log('182', email);
            // if (email !== req.decoded.email) {
            //     return res.status(401).send({ message: 'unathureze access' })
            // }
            const query = { email: email }
            const user = await bageCullection.findOne(query);
            // console.log('108 bagcullection admin chack', user);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin })
        })



        app.post('/tags', verifiToken, async (req, res) => {
            const data = req.body;
            const result = await tagesCullection.insertOne(data);
            res.send(result)
        })
        // tags data fatch
        app.get('/tags', async (req, res) => {
            const tags = req.body;
            const result = await tagesCullection.find(tags).toArray()
            res.send(result)
        })

        // Announcement added for admin Announcement page
        app.post('/announcement', verifiToken, verifiAdmin, async (req, res) => {
            const data = req.body;
            const result = await AnnouncementCullection.insertOne(data);
            res.send(result)
        })

        // Announcement fatch for admin Announcement page
        app.get('/announcement', async (req, res) => {
            const Announc = req.body;
            const result = await AnnouncementCullection.find(Announc).toArray()
            res.send(result)
        })

        // mack admin
        app.post('/mackAdmin', async (req, res) => {
            const data = req.body;
            const result = await mackAdminCullection.insertOne(data);
            res.send(result)
        })

        // mackadmin data fatch fatch 
        app.get('/mackAdmin', async (req, res) => {
            const admin = req.body;
            const result = await mackAdminCullection.find(admin).toArray()
            res.send(result)
        })



        // bage added
        app.post('/users/:email', async (req, res) => {
            const bage = req.body;
            const email = req.params.email;
            // console.log(email);

            const query = { email: email }
            const existingUser = await bageCullection.findOne(query);

            if (existingUser) {
                return res.send({ message: 'User already added' });
            }
            const result = await bageCullection.insertOne(bage);
            res.send(result)
        })


        // bage gat
        app.get('/users', async (req, res) => {
            const { search } = req.query;
            const searchFilter = search ? { name: { $regex: search, $options: 'i' } } : {};
            const result = await bageCullection.find(searchFilter).toArray()
            res.send(result)
        })

        // bage update
        app.put('/users/:email', async (req, res) => {
            const email = req.params.email;
            // console.log('bage', email);
            const query = { email: email };
            const update = {
                $set: req.body,
            };
            const result = await bageCullection.updateOne(query, update)
            res.send(result)
            // console.log(result);
        })

        // role update
        app.put('/adminUpdate/:id', verifiToken, verifiAdmin, async (req, res) => {
            const id = req.params.id
            const role = req.body;
            const update = {
                $set: role
            }
            const query = { _id: new ObjectId(id) };
            const result = await bageCullection.updateOne(query, update,)
            res.send(result)
            // console.log(result);
        })

        // comment feedback
        app.post('/feedback/:id', async (req, res) => {
            const commentId = req.params.id;
            const { feedback, filteredComments } = req.body;

            const feedbackData = {
                commentId,
                feedback,
                filteredComments,
                createdAt: new Date(),
                Status: 'panding'
            };

            try {
                const result = await feedbackCullection.insertOne(feedbackData);
                res.send(result);
            } catch (error) {
                console.error("Error saving feedback:", error);
                res.status(500).send({ message: "Failed to save feedback" });
            }
        });

        // reported data get
        app.get('/reported', verifiToken, verifiAdmin, async (req, res) => {
            const result = await feedbackCullection.find().toArray()
            res.send(result)
        })

        app.delete('/deletFeedback/:id', verifiToken, verifiAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await feedbackCullection.deleteOne(query);
            res.send(result);
        })

        // addpost 
        app.post('/addpost', async (req, res) => {
            const data = req.body;
            const result = await addpostCullection.insertOne(data);
            res.send(result)
        })

        // get home page data
        app.get('/posts/popularity', async (req, res) => {
            const { search, sortByPopularity } = req.query;

            const searchFilter = search ? { tag: { $regex: search, $options: 'i' } } : {};

            let result = [];
            if (sortByPopularity === 'true') {

                result = await addpostCullection.aggregate([
                    {
                        $addFields: {
                            voteDifference: { $subtract: ["$upVote", "$downVote"] },
                        },
                    },
                    { $match: searchFilter },
                    { $sort: { carentTime: -1 } },
                ]).toArray();
            } else {
                result = (await addpostCullection.find(searchFilter).sort({ carentTime: -1 }).toArray())
            }
            res.send(result);
        });

        // get home page data
        app.get('/addpost', async (req, res) => {
            const { search } = req.query;
            // const { carentTime } = req.body;
            // console.log('currentitem=', carentTime);
            const searchFilter = search ? { tag: { $regex: search, $options: 'i' } } : {};
            const result = await addpostCullection.find(searchFilter).toArray()
            res.send(result)
        })

        app.get('/adminProfile', verifiToken, verifiAdmin, async (req, res) => {
            const { search } = req.query;
            const searchFilter = search ? { tag: { $regex: search, $options: 'i' } } : {};
            const result = await addpostCullection.find(searchFilter).toArray()
            res.send(result)
        })


        // DELETE API Endpoint
        app.delete('/delete/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await addpostCullection.deleteOne(query);
            res.send(result);
        });


        app.get('/addpost/:email'), async (req, res) => {
            const email = req.params?.email
            // console.log(email);
            const query = { UserEmail: email }
            const result = await addpostCullection.find(query).sort({ carentTime: -1 }).toArray()
            res.send(result)
        }

        app.get('/count', async (req, res) => {
            const result = await addpostCullection.find().toArray()
            res.send(result)
        })



        app.get('/posts/count', async (req, res) => {
            const userEmail = req.query.email;
            const count = await addpostCullection.countDocuments({ authorEmail: userEmail });
            res.send({ count });
        });



        app.get('/addpost/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await addpostCullection.findOne(query);
            res.send(result)
        })

        app.put('/upVote/:id', async (req, res) => {
            const id = req.params.id
            const { upVote } = req.body;
            const update = {
                $inc: { upVote: 1 }
            }
            const query = { _id: new ObjectId(id) };
            const options = { upsert: true }
            const result = await addpostCullection.updateOne(query, update, options)
            res.send(result)
            // console.log(result);
        })

        app.put('/downVote/:id', async (req, res) => {
            const id = req.params.id
            const { downVote } = req.body;
            const update = {
                $inc: { downVote: 1 }
            }
            const query = { _id: new ObjectId(id) };
            const options = { upsert: true }
            const result = await addpostCullection.updateOne(query, update, options)
            res.send(result)
            // console.log(result);
        })

        // create payment API
        app.post('/payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);

            try {
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amount,
                    currency: 'usd',
                    payment_method_types: ['card'],
                });

                res.status(200).send({
                    clientSecret: paymentIntent.client_secret,
                });
            } catch (error) {
                res.status(500).send({ error: error.message });
            }
        });


        app.post('/coment', async (req, res) => {
            const coment = req.body;
            const result = await comentsCullection.insertOne(coment);
            res.send(result)
        })
        app.get('/coment', async (req, res) => {
            const query = req.params.comentId
            const result = await comentsCullection.find().toArray()
            res.send(result)
        })
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('croud server is running')
})

app.listen(port, () => {
    console.log(`postify sirver side running port: ${port}`);

})