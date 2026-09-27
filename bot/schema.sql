CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  no TEXT NOT NULL,
  date TEXT NOT NULL,
  hour INTEGER NOT NULL,
  master TEXT NOT NULL,
  service TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  price INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  pay_method TEXT,
  pay_amount INTEGER,
  pay_status TEXT,
  created TEXT NOT NULL,
  UNIQUE(date, hour, master)
);

CREATE TABLE IF NOT EXISTS booking_messages (
  booking_id INTEGER NOT NULL,
  chat_id TEXT NOT NULL,
  message_id INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_booking_messages_booking ON booking_messages(booking_id);
