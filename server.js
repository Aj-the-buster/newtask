require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Atlas Connection
mongoose
  .connect(process.env.MONGO_ATLAS_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.error('Failed to connect to MongoDB Atlas:', err));

// Define User schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true, enum: ['male', 'female'] },
  logins: { type: Number, default: 0 },
  clickRate: { type: Number, default: 0 },
});

const User = mongoose.model('User', userSchema);

// Define Segment schema
const segmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  filters: { type: Object, required: true },
});

const Segment = mongoose.model('Segment', segmentSchema);

// Insert sample data only if collection is empty
const sampleUsers = [
  { name: 'John Doe', age: 25, gender: 'male', logins: 5, clickRate: 45 },
  { name: 'Jane Smith', age: 30, gender: 'female', logins: 10, clickRate: 65 },
  { name: 'Sam Johnson', age: 22, gender: 'male', logins: 2, clickRate: 20 },
  { name: 'Anna Lee', age: 28, gender: 'female', logins: 8, clickRate: 50 },
  { name: 'Mike Brown', age: 35, gender: 'male', logins: 15, clickRate: 75 },
];

const insertSampleUsers = async () => {
  try {
    const count = await User.countDocuments();
    if (count === 0) {
      await User.insertMany(sampleUsers);
      console.log('Sample data inserted successfully');
    } else {
      console.log('Sample data already exists');
    }
  } catch (error) {
    console.error('Error inserting sample data:', error);
  }
};
insertSampleUsers();

// Routes
app.get('/api/segments', async (req, res) => {
  try {
    const segments = await Segment.find();
    res.json(segments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching segments', error });
  }
});

app.post('/api/segments', async (req, res) => {
  const { name, filters } = req.body;

  if (!name || !filters) {
    return res.status(400).json({ message: 'Segment name and filters are required.' });
  }

  const newSegment = new Segment({ name, filters });

  try {
    await newSegment.save();
    res.status(201).json(newSegment);
  } catch (error) {
    res.status(500).json({ message: 'Error saving segment', error });
  }
});

app.post('/api/users/segment', async (req, res) => {
  const { filters } = req.body;
  const query = {};

  if (filters.name) {
    query.name = new RegExp(filters.name, 'i'); // case-insensitive regex
  }
  if (filters.ageRange) {
    query.age = {
      $gte: filters.ageRange.min || 0,
      $lte: filters.ageRange.max || 100,
    };
  }
  if (filters.gender && filters.gender !== 'all') {
    query.gender = filters.gender;
  }
  if (filters.logins) {
    query.logins = { $gte: filters.logins };
  }
  if (filters.clickRate) {
    query.clickRate = { $gte: filters.clickRate };
  }

  try {
    const users = await User.find(query);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error filtering users', error });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
