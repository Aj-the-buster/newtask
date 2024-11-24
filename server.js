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
  // Demographics
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  country: { type: String, default: '' },

  // Behavior
  deviceType: { type: String, enum: ['mobile', 'desktop', 'tablet', ''], default: '' },
  lastLogin: { type: Date },
  registrationDate: { type: Date, default: Date.now },
  activeInLastDays: { type: Number, default: 0 },

  // Engagement
  logins: { type: Number, default: 0 },
  clickRate: { type: Number, default: 0 },
  subscriptionStatus: { 
    type: String, 
    enum: ['active', 'inactive', 'trial', ''], 
    default: '' 
  },
  purchaseValue: { type: Number, default: 0 }
}, {
  timestamps: true
});

const User = mongoose.model('User', userSchema);

// Define Segment schema
const segmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  filters: { type: Object, required: true }
}, {
  timestamps: true
});

const Segment = mongoose.model('Segment', segmentSchema);

// Sample data
const sampleUsers = [
  { 
    name: 'John Doe', 
    age: 25, 
    gender: 'male', 
    country: 'USA',
    deviceType: 'mobile',
    lastLogin: new Date('2024-03-20'),
    registrationDate: new Date('2024-01-01'),
    activeInLastDays: 2,
    logins: 5, 
    clickRate: 45,
    subscriptionStatus: 'active',
    purchaseValue: 150
  },
  { 
    name: 'Jane Smith', 
    age: 30, 
    gender: 'female', 
    country: 'Canada',
    deviceType: 'desktop',
    lastLogin: new Date('2024-03-21'),
    registrationDate: new Date('2024-01-15'),
    activeInLastDays: 1,
    logins: 10, 
    clickRate: 65,
    subscriptionStatus: 'trial',
    purchaseValue: 75
  },
  { 
    name: 'Sam Johnson', 
    age: 22, 
    gender: 'male', 
    country: 'UK',
    deviceType: 'mobile',
    lastLogin: new Date('2024-03-15'),
    registrationDate: new Date('2024-02-01'),
    activeInLastDays: 7,
    logins: 2, 
    clickRate: 20,
    subscriptionStatus: 'inactive',
    purchaseValue: 0
  },
  { 
    name: 'Anna Lee', 
    age: 28, 
    gender: 'female', 
    country: 'Australia',
    deviceType: 'tablet',
    lastLogin: new Date('2024-03-22'),
    registrationDate: new Date('2024-02-15'),
    activeInLastDays: 0,
    logins: 8, 
    clickRate: 50,
    subscriptionStatus: 'active',
    purchaseValue: 200
  },
  { 
    name: 'Mike Brown', 
    age: 35, 
    gender: 'male', 
    country: 'USA',
    deviceType: 'desktop',
    lastLogin: new Date('2024-03-21'),
    registrationDate: new Date('2024-01-20'),
    activeInLastDays: 1,
    logins: 15, 
    clickRate: 75,
    subscriptionStatus: 'active',
    purchaseValue: 300
  }
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
app.post('/api/users/segment', async (req, res) => {
  const { filters } = req.body;
  const query = {};

  try {
    // Demographics filters
    if (filters.name) {
      query.name = new RegExp(filters.name, 'i');
    }

    if (filters.ageRange && (filters.ageRange.min || filters.ageRange.max)) {
      query.age = {};
      if (filters.ageRange.min) query.age.$gte = Number(filters.ageRange.min);
      if (filters.ageRange.max) query.age.$lte = Number(filters.ageRange.max);
    }

    if (filters.gender && filters.gender !== 'all') {
      query.gender = filters.gender;
    }

    if (filters.country) {
      query.country = new RegExp(filters.country, 'i');
    }

    // Behavior filters
    if (filters.deviceType) {
      query.deviceType = filters.deviceType;
    }

    if (filters.activeInLastDays) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - Number(filters.activeInLastDays));
      query.lastLogin = { $gte: daysAgo };
    }

    if (filters.registrationDateRange) {
      query.registrationDate = {};
      if (filters.registrationDateRange.min) {
        query.registrationDate.$gte = new Date(filters.registrationDateRange.min);
      }
      if (filters.registrationDateRange.max) {
        query.registrationDate.$lte = new Date(filters.registrationDateRange.max);
      }
    }

    // Engagement filters
    if (filters.logins) {
      query.logins = { $gte: Number(filters.logins) };
    }

    if (filters.clickRate) {
      query.clickRate = { $gte: Number(filters.clickRate) };
    }

    if (filters.subscriptionStatus && filters.subscriptionStatus !== 'all') {
      query.subscriptionStatus = filters.subscriptionStatus;
    }

    if (filters.purchaseValue && (filters.purchaseValue.min || filters.purchaseValue.max)) {
      query.purchaseValue = {};
      if (filters.purchaseValue.min) {
        query.purchaseValue.$gte = Number(filters.purchaseValue.min);
      }
      if (filters.purchaseValue.max) {
        query.purchaseValue.$lte = Number(filters.purchaseValue.max);
      }
    }

    const users = await User.find(query).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Error filtering users:', error);
    res.status(500).json({ error: 'Error filtering users' });
  }
});

// Segment routes remain the same, just adding description field handling
app.post('/api/segments', async (req, res) => {
  const { name, description, filters } = req.body;
  
  if (!name || !filters) {
    return res.status(400).json({ error: 'Segment name and filters are required.' });
  }

  const newSegment = new Segment({ name, description, filters });
  
  try {
    await newSegment.save();
    res.status(201).json(newSegment);
  } catch (error) {
    console.error('Error saving segment:', error);
    res.status(500).json({ error: 'Error saving segment' });
  }
});