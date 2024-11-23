const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
 // Load environment variables from a `.env` file

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Atlas connection
// const mongoURI = process.env.MONGO_URI; // Fetch MongoDB URI from environment variables
const mongoURI = "mongodb+srv://ajayvissu2000:ajay@cluster0.rjdnj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.error('Failed to connect to MongoDB Atlas:', err));

// Define User schema
const userSchema = new mongoose.Schema({
  name: String,
  age: Number,
  gender: String,
  logins: Number,
  clickRate: Number
});

const User = mongoose.model('User', userSchema);

// Define Segment schema
const segmentSchema = new mongoose.Schema({
  name: String,
  filters: Object
});

const Segment = mongoose.model('Segment', segmentSchema);

// Sample data
const sampleUsers = [
  { name: 'John Doe', age: 25, gender: 'male', logins: 5, clickRate: 45 },
  { name: 'Jane Smith', age: 30, gender: 'female', logins: 10, clickRate: 65 },
  { name: 'Sam Johnson', age: 22, gender: 'male', logins: 2, clickRate: 20 },
  { name: 'Anna Lee', age: 28, gender: 'female', logins: 8, clickRate: 50 },
  { name: 'Mike Brown', age: 35, gender: 'male', logins: 15, clickRate: 75 }
];

// Insert data
User.insertMany(sampleUsers)
  .then(() => console.log('Data inserted successfully'))
  .catch((error) => console.error('Error inserting data:', error));

// Routes
app.get('/api/segments', async (req, res) => {
  try {
    const segments = await Segment.find();
    res.json(segments);
  } catch (error) {
    res.status(500).send('Error fetching segments');
  }
});

app.post('/api/segments', async (req, res) => {
  const { name, filters } = req.body;
  if (!name || !filters) {
    return res.status(400).send('Segment name and filters are required.');
  }

  const newSegment = new Segment({ name, filters });

  try {
    await newSegment.save();
    res.status(201).json(newSegment);
  } catch (error) {
    res.status(500).send('Error saving segment');
  }
});

app.post('/api/users/segment', async (req, res) => {
  const { filters } = req.body;
  const query = {};

  // Name filter
  if (filters.name) {
    query.name = new RegExp(filters.name, 'i'); // case-insensitive regex
  }

  // Age range filter
  if (filters.ageRange) {
    query.age = { $gte: filters.ageRange.min || 0, $lte: filters.ageRange.max || 100 };
  }

  // Gender filter
  if (filters.gender && filters.gender !== 'all') {
    query.gender = filters.gender;
  }

  // Minimum logins filter
  if (filters.logins) {
    query.logins = { $gte: filters.logins };
  }

  // Minimum click rate filter
  if (filters.clickRate) {
    query.clickRate = { $gte: filters.clickRate };
  }

  try {
    const users = await User.find(query);
    res.json(users);
  } catch (error) {
    res.status(500).send('Error filtering users');
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
