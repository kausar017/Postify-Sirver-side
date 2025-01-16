const express = require('express');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');



// meddilwar
app.use(cors());
app.use(express.json());


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
        await client.connect();

        const addpostCullection = client.db("Postify").collection("addpost");
        const comentsCullection = client.db("Postify").collection("coments");


        app.post('/addpost', async (req, res) => {
            const data = req.body;
            const result = await addpostCullection.insertOne(data);
            res.send(result)
        })
        app.get('/addpost', async (req, res) => {
            const { search } = req.query;
            const searchFilter = search ? { tag: { $regex: search, $options: 'i' } } : {};
            const result = await addpostCullection.find(searchFilter).sort({ carentTime: -1 }).toArray()
            res.send(result)
        })
   
        app.get('/posts/popularity', async (req, res) => {
            const { search } = req.query;
            const searchFilter = search ? { tag: { $regex: search, $options: 'i' } } : {}
            const result = await addpostCullection.aggregate([
                {
                    $match: searchFilter
                },
                {
                    $addFields: {
                        voteDifference: { $subtract: ["$upVote", "$downVote"] },
                    },
                },
                {
                    $sort: { voteDifference: -1 },
                },
            ]).toArray();
            res.send(result)
        })


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
            console.log(result);
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
            console.log(result);
        })


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
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
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