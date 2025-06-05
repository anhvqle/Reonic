import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bodyParser from 'body-parser';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

let db;

(async () => {
  db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS simulation_inputs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chargepoints INTEGER,
      arrivalMultiplier INTEGER,
      consumption REAL,
      chargingPower INTEGER
    );

    CREATE TABLE IF NOT EXISTS simulation_outputs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inputId INTEGER,
      totalEnergyKWh REAL,
      peakPowerKW REAL,
      dailyAverages TEXT,
      eventsPerDay INTEGER,
      eventsPerWeek INTEGER,
      eventsPerMonth INTEGER,
      eventsPerYear INTEGER,
      FOREIGN KEY(inputId) REFERENCES simulation_inputs(id) ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
})();

// INPUTS
app.get('/inputs', async (req, res) => {
  try {
    const inputs = await db.all(`SELECT * FROM simulation_inputs`);
    res.json(inputs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/inputs/:id', async (req, res) => {
  try {
    const input = await db.get(`SELECT * FROM simulation_inputs WHERE id = ?`, req.params.id);
    res.json(input);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/inputs', async (req, res) => {
  console.log(req.body);
  try {
    const { chargepoints, arrivalMultiplier, consumption, chargingPower } = req.body;
    const result = await db.run(
      `INSERT INTO simulation_inputs (chargepoints, arrivalMultiplier, consumption, chargingPower)
       VALUES (?, ?, ?, ?)`,
      [chargepoints, arrivalMultiplier, consumption, chargingPower]
    );
    const input = await db.get(`SELECT * FROM simulation_inputs WHERE id = ?`, result.lastID);
    res.json(input);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/inputs/:id', async (req, res) => {
  try {
    const { chargepoints, arrivalMultiplier, consumption, chargingPower } = req.body;
    await db.run(
      `UPDATE simulation_inputs SET chargepoints = ?, arrivalMultiplier = ?, consumption = ?, chargingPower = ? WHERE id = ?`,
      [chargepoints, arrivalMultiplier, consumption, chargingPower, req.params.id]
    );
    await db.run(`DELETE FROM simulation_outputs WHERE inputId = ?`, req.params.id);
    const updated = await db.get(`SELECT * FROM simulation_inputs WHERE id = ?`, req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/inputs/:id', async (req, res) => {
  try {
    await db.run(`DELETE FROM simulation_inputs WHERE id = ?`, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// OUTPUTS
app.get('/outputs', async (req, res) => {
  try {
    const outputs = await db.all(`SELECT * FROM simulation_outputs`);
    res.json(outputs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/outputs/:id', async (req, res) => {
  try {
    const output = await db.get(`SELECT * FROM simulation_outputs WHERE id = ?`, req.params.id);
    res.json(output);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/simulate', async (req, res) => {
  try {
    const { inputId } = req.body;
    const input = await db.get(`SELECT * FROM simulation_inputs WHERE id = ?`, inputId);
    if (!input) return res.status(404).json({ error: 'Input not found' });

    const { chargepoints, arrivalMultiplier, consumption, chargingPower } = input;

    const arrivalProbabilities = [
      0, 0, 0, 0.94, 0.94, 0.94,
      0.94, 2.83, 2.83, 5.66, 5.66, 5.66,
      7.55, 7.55, 7.55, 10.38, 10.38, 10.38,
      4.72, 4.72, 4.72, 0.94, 0.94, 0.94
    ];

    const exampleDayData = arrivalProbabilities.map((p, hour) => ({
      hour: `${hour}:00`,
      totalPower: Math.round((p / 100) * arrivalMultiplier * chargepoints * chargingPower)
    }));

    const sessionsPerDay = (arrivalMultiplier / 100) * chargepoints;
    const totalEnergyKWh = Math.round(sessionsPerDay * consumption * 365);
    const perDay = Math.round(sessionsPerDay);
    const perWeek = perDay * 7;
    const perMonth = perDay * 30;
    const perYear = perDay * 365;

    const result = await db.run(
      `INSERT INTO simulation_outputs (
         inputId, totalEnergyKWh, peakPowerKW, dailyAverages, eventsPerDay, eventsPerWeek, eventsPerMonth, eventsPerYear
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        inputId,
        totalEnergyKWh,
        Math.max(...exampleDayData.map(d => d.totalPower)),
        JSON.stringify(exampleDayData),
        perDay,
        perWeek,
        perMonth,
        perYear
      ]
    );

    const output = await db.get(`SELECT * FROM simulation_outputs WHERE id = ?`, result.lastID);
    res.status(201).json(output);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => console.log(`API running on port ${PORT}`));
