#!/usr/bin/node
const express = require('express');
const { createClient } = require('redis');
const { promisify } = require('util');
const kue = require('kue');

const app = express();
const client = createClient();
const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.set).bind(client);
const queue = kue.createQueue();

let reservationEnabled = true;

async function reserveSeat(number) {
  await setAsync('available_seats', number);
}

async function getCurrentAvailableSeats() {
  return parseInt(await getAsync('available_seats')) || 0;
}

app.get('/available_seats', async (req, res) => {
  const seats = await getCurrentAvailableSeats();
  res.json({ numberOfAvailableSeats: seats });
});

app.get('/reserve_seat', async (req, res) => {
  if (!reservationEnabled) {
    return res.json({ status: 'Reservation are blocked' });
  }

  const job = queue.create('reserve_seat').save((err) => {
    if (err) return res.json({ status: 'Reservation failed' });
    res.json({ status: 'Reservation in process' });
  });

  job.on('complete', () => console.log(`Seat reservation job ${job.id} completed`))
     .on('failed', (error) => console.log(`Seat reservation job ${job.id} failed: ${error}`));
});

app.get('/process', (req, res) => {
  res.json({ status: 'Queue processing' });

  queue.process('reserve_seat', async (job, done) => {
    const seats = await getCurrentAvailableSeats();
    if (seats <= 0) {
      reservationEnabled = false;
      return done(new Error('Not enough seats available'));
    }

    await reserveSeat(seats - 1);
    done();
  });
});

reserveSeat(50);
app.listen(1245, () => console.log('Server running on port 1245'));
