
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database/init');
const router = express.Router();

// Register staff
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, birth_date, birth_time, birth_location, experience_years } = req.body;
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(
      `INSERT INTO staff (name, email, password, role, birth_date, birth_time, birth_location, experience_years) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, hashedPassword, role || 'staff', birth_date, birth_time, birth_location, experience_years || 0],
      function(err) {
        if (err) {
          return res.status(400).json({ error: 'Email already exists' });
        }
        
        const token = jwt.sign(
          { id: this.lastID, email, role: role || 'staff' },
          process.env.JWT_SECRET || 'yca_secret',
          { expiresIn: '24h' }
        );
        
        res.status(201).json({ token, user: { id: this.lastID, name, email, role: role || 'staff' } });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  db.get('SELECT * FROM staff WHERE email = ?', [email], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'yca_secret',
      { expiresIn: '24h' }
    );
    
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      } 
    });
  });
});

module.exports = router;
