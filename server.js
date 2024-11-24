const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

const mongoose = require('mongoose');

// MongoDB Atlas connection
// Replace <username>, <password>, <cluster-url> with your MongoDB Atlas credentials
const MONGODB_URI = "mongodb+srv://ajayvissu2000:ajay@cluster0.rjdnj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Connection options
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB atlas');
  } catch (err) {
    console.error('Failed to connect to MongoDB Atlas:', err);
    process.exit(1);
  }
};

// Call the connect function
connectDB();

// Handle connection errors after initial connection
mongoose.connection.on('error', err => {
  console.error('MongoDB Atlas connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB Atlas disconnected. Attempting to reconnect...');
});

// Define User schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  logins: { type: Number, default: 0 },
  clickRate: { type: Number, default: 0 }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

const User = mongoose.model('User', userSchema);

// Define Segment schema
const segmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  filters: { type: Object, required: true }
}, {
  timestamps: true
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

// Insert sample data only if the collection is empty
const insertSampleData = async () => {
  try {
    const count = await User.countDocuments();
    if (count === 0) {
      await User.insertMany(sampleUsers);
      console.log('Sample data inserted successfully');
    }
  } catch (error) {
    console.error('Error inserting sample data:', error);
  }
};

// Call insertSampleData after connection is established
mongoose.connection.once('open', () => {
  insertSampleData();
});

// API Routes
app.get('/api/segments', async (req, res) => {
  try {
    const segments = await Segment.find().sort({ createdAt: -1 });
    res.json(segments);
  } catch (error) {
    console.error('Error fetching segments:', error);
    res.status(500).json({ error: 'Error fetching segments' });
  }
});

app.post('/api/segments', async (req, res) => {
  const { name, filters } = req.body;
  
  if (!name || !filters) {
    return res.status(400).json({ error: 'Segment name and filters are required.' });
  }

  const newSegment = new Segment({ name, filters });
  
  try {
    await newSegment.save();
    res.status(201).json(newSegment);
  } catch (error) {
    console.error('Error saving segment:', error);
    res.status(500).json({ error: 'Error saving segment' });
  }
});

app.post('/api/users/segment', async (req, res) => {
  const { filters } = req.body;
  const query = {};

  try {
    // Name filter
    if (filters.name) {
      query.name = new RegExp(filters.name, 'i');
    }

    // Age range filter
    if (filters.ageRange) {
      query.age = {
        $gte: filters.ageRange.min || 0,
        $lte: filters.ageRange.max || 100
      };
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

    const users = await User.find(query).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Error filtering users:', error);
    res.status(500).json({ error: 'Error filtering users' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});